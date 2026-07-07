import { Test, TestingModule } from '@nestjs/testing';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { AdminService } from '../admin/admin.service';
import { DomainError } from '@common/domain-error';
import { HelperService } from '@common/helpers/helper.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { migrateTestDatabase } from '../../../test-utils/prisma-test-database';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let usersService: UsersService;
  let adminService: AdminService;

  const dbPath = join(process.cwd(), 'users.service.spec.db');

  beforeAll(async () => {
    removeSqliteFiles(dbPath);
    migrateTestDatabase(dbPath);

    moduleRef = await Test.createTestingModule({
      providers: [PrismaService, HelperService, UsersService, AdminService],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    usersService = moduleRef.get(UsersService);
    adminService = moduleRef.get(AdminService);
  });

  beforeEach(async () => {
    await prisma.resetForTests();
  });

  afterAll(async () => {
    await moduleRef.close();
    removeSqliteFiles(dbPath);
  });

  describe('list', () => {
    it('returns seeded users', async () => {
      await expect(usersService.list()).resolves.toEqual([
        expect.objectContaining({ id: 1, username: 'alice', balance: 1000 }),
        expect.objectContaining({ id: 2, username: 'bob', balance: 500 }),
        expect.objectContaining({ id: 3, username: 'charlie', balance: 0 }),
      ]);
    });
  });

  describe('deposit', () => {
    it('increases user balance and keeps ledger reconciliation consistent', async () => {
      const result = await usersService.deposit(1, 100, 'users-deposit');

      expect(result).toEqual({
        status: 201,
        body: {
          userId: 1,
          balance: 1100,
          ledgerEntryId: expect.any(Number),
        },
      });
      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({
          recordedBalance: 1100,
          calculatedBalance: 1100,
          isConsistent: true,
        }),
      );
    });

    it('replays the saved response for the same idempotency key', async () => {
      const first = await usersService.deposit(1, 100, 'users-deposit-replay');
      const replay = await usersService.deposit(1, 100, 'users-deposit-replay');

      expect(replay).toEqual(first);
      await expect(adminService.reconcile(1)).resolves.toEqual(
        expect.objectContaining({ recordedBalance: 1100 }),
      );
    });

    it('rejects a reused idempotency key with a different request body', async () => {
      await usersService.deposit(1, 100, 'users-deposit-conflict');

      await expectDomainError(
        () => usersService.deposit(1, 101, 'users-deposit-conflict'),
        409,
      );
    });

    it('rejects missing idempotency key', async () => {
      await expectDomainError(() => usersService.deposit(1, 100), 400);
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
