import { Test, TestingModule } from '@nestjs/testing';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { AdminService } from '../admin/admin.service';
import { DomainError } from '@common/domain-error';
import { HelperService } from '@common/helpers/helper.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { migrateTestDatabase } from '../../../test-utils/prisma-test-database';
import { UsersService } from '../users/users.service';
import { BetsService } from './bets.service';

describe('BetsService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let betsService: BetsService;
  let adminService: AdminService;

  const dbPath = join(process.cwd(), 'bets.service.spec.db');

  beforeAll(async () => {
    removeSqliteFiles(dbPath);
    migrateTestDatabase(dbPath);

    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        HelperService,
        UsersService,
        BetsService,
        AdminService,
      ],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    betsService = moduleRef.get(BetsService);
    adminService = moduleRef.get(AdminService);
  });

  beforeEach(async () => {
    await prisma.resetForTests();
  });

  afterAll(async () => {
    await moduleRef.close();
    removeSqliteFiles(dbPath);
  });

  describe('create', () => {
    it('creates a placed bet, deducts balance and writes a debit ledger entry', async () => {
      const result = await betsService.create(
        { userId: 1, gameId: 'bets-create', amount: 100 },
        'bets-create',
      );

      expect(result.body).toEqual(
        expect.objectContaining({
          userId: 1,
          gameId: 'bets-create',
          amount: 100,
          status: 'PLACED',
          balance: 900,
        }),
      );
      await expect(betsService.list(1)).resolves.toEqual([
        expect.objectContaining({
          id: result.body.id,
          status: 'PLACED',
        }),
      ]);
      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          recordedBalance: 900,
          calculatedBalance: 900,
          isConsistent: true,
        }),
      );
    });

    it('replays the same response for a repeated idempotency key', async () => {
      const first = await betsService.create(
        { userId: 1, gameId: 'bets-replay', amount: 100 },
        'bets-replay',
      );
      const replay = await betsService.create(
        { userId: 1, gameId: 'bets-replay', amount: 100 },
        'bets-replay',
      );

      expect(replay).toEqual(first);
      await expect(betsService.list(1)).resolves.toHaveLength(1);
      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({ recordedBalance: 900 }),
      );
    });

    it('rejects a reused idempotency key with a different request body', async () => {
      await betsService.create(
        { userId: 1, gameId: 'bets-conflict', amount: 100 },
        'bets-conflict',
      );

      await expectDomainError(
        () =>
          betsService.create(
            { userId: 1, gameId: 'bets-conflict', amount: 101 },
            'bets-conflict',
          ),
        409,
      );
    });

    it('rejects insufficient balance', async () => {
      await expectDomainError(
        () =>
          betsService.create(
            { userId: 2, gameId: 'bets-too-large', amount: 501 },
            'bets-too-large',
          ),
        400,
      );
    });
  });

  describe('settle', () => {
    it('settles a winning bet and credits payout', async () => {
      const bet = await betsService.create(
        { userId: 1, gameId: 'bets-win', amount: 100 },
        'bets-win',
      );

      const settlement = await betsService.settle(bet.body.id, 'WIN');

      expect(settlement).toEqual(
        expect.objectContaining({
          status: 'SETTLED',
          result: 'WIN',
          payoutAmount: 200,
          balance: 1100,
        }),
      );
      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          recordedBalance: 1100,
          calculatedBalance: 1100,
          isConsistent: true,
        }),
      );
    });

    it('settles a losing bet without crediting payout', async () => {
      const bet = await betsService.create(
        { userId: 1, gameId: 'bets-lose', amount: 100 },
        'bets-lose',
      );

      const settlement = await betsService.settle(bet.body.id, 'LOSE');

      expect(settlement).toEqual(
        expect.objectContaining({
          status: 'SETTLED',
          result: 'LOSE',
          payoutAmount: 0,
          balance: 900,
        }),
      );
      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          recordedBalance: 900,
          calculatedBalance: 900,
          isConsistent: true,
        }),
      );
    });

    it('rejects repeated settlement', async () => {
      const bet = await betsService.create(
        { userId: 1, gameId: 'bets-repeat-settle', amount: 100 },
        'bets-repeat-settle',
      );

      await betsService.settle(bet.body.id, 'LOSE');

      await expectDomainError(
        () => betsService.settle(bet.body.id, 'WIN'),
        409,
      );
    });
  });

  describe('cancel', () => {
    it('cancels a placed bet and refunds balance', async () => {
      const bet = await betsService.create(
        { userId: 1, gameId: 'bets-cancel', amount: 100 },
        'bets-cancel',
      );

      const cancellation = await betsService.cancel(bet.body.id);

      expect(cancellation).toEqual(
        expect.objectContaining({
          status: 'CANCELLED',
          balance: 1000,
        }),
      );
      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          recordedBalance: 1000,
          calculatedBalance: 1000,
          isConsistent: true,
        }),
      );
    });

    it('rejects cancelling a terminal bet', async () => {
      const bet = await betsService.create(
        { userId: 1, gameId: 'bets-terminal-cancel', amount: 100 },
        'bets-terminal-cancel',
      );

      await betsService.settle(bet.body.id, 'LOSE');

      await expectDomainError(() => betsService.cancel(bet.body.id), 409);
    });
  });
});

/**
 * 断言同步业务方法抛出指定 HTTP 状态码的 DomainError。
 */
async function expectDomainError(
  fn: () => unknown | Promise<unknown>,
  statusCode: number,
): Promise<void> {
  try {
    await fn();
    fail(`Expected DomainError with status ${statusCode}`);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).statusCode).toBe(statusCode);
  }
}

/**
 * 删除测试 SQLite 主文件和 WAL/SHM 辅助文件，保证单元测试之间互不污染。
 */
function removeSqliteFiles(dbPath: string): void {
  for (const suffix of ['', '-shm', '-wal']) {
    try {
      unlinkSync(`${dbPath}${suffix}`);
    } catch {
      // 测试数据库文件不存在时无需处理。
    }
  }
}
