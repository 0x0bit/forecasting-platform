import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { unlinkSync } from 'fs';
import { join } from 'path';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '@common/filters/domain-exception.filter';
import { PrismaService } from '@common/prisma/prisma.service';
import { migrateTestDatabase } from '../src/test-utils/prisma-test-database';

describe('Forecasting API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const dbPath = join(process.cwd(), 'test.forecasting.db');

  beforeAll(async () => {
    migrateTestDatabase(dbPath);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.resetForTests();
  });

  afterAll(async () => {
    await app.close();
    for (const suffix of ['', '-shm', '-wal']) {
      try {
        unlinkSync(`${dbPath}${suffix}`);
      } catch {
        // Ignore missing sqlite sidecar files.
      }
    }
  });

  describe('UsersController (e2e)', () => {
    describe('GET /api/users', () => {
      it('returns seeded users', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/users')
          .expect(200);

        expect(response.body).toEqual([
          expect.objectContaining({ id: 1, username: 'alice', balance: 1000 }),
          expect.objectContaining({ id: 2, username: 'bob', balance: 500 }),
          expect.objectContaining({ id: 3, username: 'charlie', balance: 0 }),
        ]);
      });
    });

    describe('POST /api/users/:id/deposit', () => {
      it('increases balance after deposit', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/users/1/deposit')
          .set('Idempotency-Key', 'deposit-1')
          .send({ amount: 100 })
          .expect(201);

        expect(response.body).toEqual(
          expect.objectContaining({
            userId: 1,
            balance: 1100,
            ledgerEntryId: expect.any(Number),
          }),
        );
      });

      it('applies the same deposit idempotency key only once', async () => {
        await request(app.getHttpServer())
          .post('/api/users/1/deposit')
          .set('Idempotency-Key', 'deposit-same')
          .send({ amount: 100 })
          .expect(201);

        const replay = await request(app.getHttpServer())
          .post('/api/users/1/deposit')
          .set('Idempotency-Key', 'deposit-same')
          .send({ amount: 100 })
          .expect(201);

        expect(replay.body.balance).toBe(1100);

        const reconcile = await request(app.getHttpServer())
          .get('/api/admin/reconcile')
          .query({ userId: 1 })
          .expect(200);
        expect(reconcile.body.recordedBalance).toBe(1100);
        expect(reconcile.body.calculatedBalance).toBe(1100);
      });

      it('rejects the same deposit idempotency key with a different amount', async () => {
        await request(app.getHttpServer())
          .post('/api/users/1/deposit')
          .set('Idempotency-Key', 'deposit-conflict')
          .send({ amount: 100 })
          .expect(201);

        await request(app.getHttpServer())
          .post('/api/users/1/deposit')
          .set('Idempotency-Key', 'deposit-conflict')
          .send({ amount: 101 })
          .expect(409);
      });
    });
  });

  describe('BetsController (e2e)', () => {
    describe('POST /api/bets', () => {
      it('rejects a bet when balance is insufficient', async () => {
        await request(app.getHttpServer())
          .post('/api/bets')
          .set('Idempotency-Key', 'too-large')
          .send({ userId: 2, gameId: 'game-1', amount: 501 })
          .expect(400);
      });

      it('applies the same bet idempotency key only once', async () => {
        const first = await request(app.getHttpServer())
          .post('/api/bets')
          .set('Idempotency-Key', 'bet-same')
          .send({ userId: 1, gameId: 'game-1', amount: 100 })
          .expect(201);

        const replay = await request(app.getHttpServer())
          .post('/api/bets')
          .set('Idempotency-Key', 'bet-same')
          .send({ userId: 1, gameId: 'game-1', amount: 100 })
          .expect(201);

        expect(replay.body.id).toBe(first.body.id);
        expect(replay.body.balance).toBe(900);

        const reconcile = await request(app.getHttpServer())
          .get('/api/admin/reconcile')
          .query({ userId: 1 })
          .expect(200);
        expect(reconcile.body.betStatusCounts.PLACED).toBe(1);
      });
    });

    describe('GET /api/bets', () => {
      it('returns bets filtered by user', async () => {
        await request(app.getHttpServer())
          .post('/api/bets')
          .set('Idempotency-Key', 'list-bet')
          .send({ userId: 1, gameId: 'game-list', amount: 100 })
          .expect(201);

        const response = await request(app.getHttpServer())
          .get('/api/bets')
          .query({ userId: 1 })
          .expect(200);

        expect(response.body).toEqual([
          expect.objectContaining({
            userId: 1,
            gameId: 'game-list',
            amount: 100,
            status: 'PLACED',
          }),
        ]);
      });
    });

    describe('POST /api/bets/:id/settle', () => {
      it('credits balance when a bet settles as WIN', async () => {
        const bet = await request(app.getHttpServer())
          .post('/api/bets')
          .set('Idempotency-Key', 'winning-bet')
          .send({ userId: 1, gameId: 'game-2', amount: 100 })
          .expect(201);

        const settlement = await request(app.getHttpServer())
          .post(`/api/bets/${bet.body.id}/settle`)
          .send({ result: 'WIN' })
          .expect(201);

        expect(settlement.body.payoutAmount).toBe(200);
        expect(settlement.body.balance).toBe(1100);
      });

      it('does not allow a settled bet to be settled again', async () => {
        const bet = await request(app.getHttpServer())
          .post('/api/bets')
          .set('Idempotency-Key', 'settle-once')
          .send({ userId: 1, gameId: 'game-3', amount: 100 })
          .expect(201);

        await request(app.getHttpServer())
          .post(`/api/bets/${bet.body.id}/settle`)
          .send({ result: 'LOSE' })
          .expect(201);

        await request(app.getHttpServer())
          .post(`/api/bets/${bet.body.id}/settle`)
          .send({ result: 'WIN' })
          .expect(409);
      });
    });

    describe('POST /api/bets/:id/cancel', () => {
      it('refunds a placed bet when cancelled', async () => {
        const bet = await request(app.getHttpServer())
          .post('/api/bets')
          .set('Idempotency-Key', 'cancel-bet')
          .send({ userId: 1, gameId: 'game-4', amount: 100 })
          .expect(201);

        const cancelled = await request(app.getHttpServer())
          .post(`/api/bets/${bet.body.id}/cancel`)
          .expect(201);

        expect(cancelled.body.status).toBe('CANCELLED');
        expect(cancelled.body.balance).toBe(1000);
      });
    });
  });

  describe('AdminController (e2e)', () => {
    describe('GET /api/admin/reconcile', () => {
      it('returns recorded balance, calculated balance, status counts and anomalies', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/admin/reconcile')
          .query({ userId: 1 })
          .expect(200);

        expect(response.body).toEqual({
          userId: 1,
          recordedBalance: 1000,
          calculatedBalance: 1000,
          betStatusCounts: {
            PLACED: 0,
            SETTLED: 0,
            CANCELLED: 0,
          },
          isConsistent: true,
          anomalies: [],
        });
      });
    });
  });
});
