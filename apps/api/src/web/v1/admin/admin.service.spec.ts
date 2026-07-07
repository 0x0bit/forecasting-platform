import { Test, TestingModule } from '@nestjs/testing';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { BetsService } from '../bets/bets.service';
import { UsersService } from '../users/users.service';
import { HelperService } from '@common/helpers/helper.service';
import { PrismaService, nowSql } from '@common/prisma/prisma.service';
import { migrateTestDatabase } from '../../../test-utils/prisma-test-database';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let betsService: BetsService;
  let adminService: AdminService;

  const dbPath = join(process.cwd(), 'admin.service.spec.db');

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

  describe('reconcile', () => {
    it('returns a consistent reconciliation result for a seeded user', async () => {
      await expect(adminService.reconcile(1)).resolves.toEqual({
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

    it('detects a bet missing its debit ledger entry', async () => {
      await prisma.bet.create({
        data: {
          userId: 1,
          gameId: 'admin-missing-debit',
          amount: 100,
          status: 'PLACED',
          createdAt: nowSql(),
        },
      });

      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          isConsistent: false,
          anomalies: [
            expect.objectContaining({
              reason: 'MISSING_BET_DEBIT',
            }),
          ],
        }),
      );
    });

    it('detects duplicate settlement credit ledger entries', async () => {
      const bet = await betsService.create(
        { userId: 1, gameId: 'admin-duplicate-credit', amount: 100 },
        'admin-duplicate-credit',
      );
      await betsService.settle(bet.body.id, 'WIN');

      await prisma.ledgerEntry.create({
        data: {
          userId: 1,
          betId: bet.body.id,
          type: 'BET_CREDIT',
          amount: 200,
          createdAt: nowSql(),
        },
      });

      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          isConsistent: false,
          anomalies: [
            expect.objectContaining({
              betId: bet.body.id,
              reason: 'DUPLICATE_BET_CREDIT',
            }),
          ],
        }),
      );
    });

    it('detects a cancelled bet missing its refund ledger entry', async () => {
      const bet = await betsService.create(
        { userId: 1, gameId: 'admin-missing-refund', amount: 100 },
        'admin-missing-refund',
      );

      await prisma.bet.update({
        where: { id: bet.body.id },
        data: {
          status: 'CANCELLED',
          canceledAt: nowSql(),
        },
      });

      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          isConsistent: false,
          anomalies: [
            expect.objectContaining({
              betId: bet.body.id,
              reason: 'MISSING_BET_REFUND',
            }),
          ],
        }),
      );
    });
  });
});

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
