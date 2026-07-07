import { Injectable } from '@nestjs/common';
import { DomainError } from '@common/domain-error';
import { HelperService, IdempotencyRecord } from '@common/helpers/helper.service';
import { PrismaService, nowSql } from '@common/prisma/prisma.service';
import type {
  DepositResponse,
  UserListItem,
  UserRow,
} from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: HelperService,
  ) {}

  /**
   * 返回所有静态用户，供前端选择账户和展示余额。
   */
  async list(): Promise<UserListItem[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: { id: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      balance: row.balance,
      initialBalance: row.initialBalance,
      createdAt: row.createdAt,
    }));
  }

  /**
   * 给用户充值：校验幂等 Key、增加余额、追加充值账本，并保存幂等响应。
   */
  async deposit(
    userId: number,
    amount: number,
    rawKey?: string,
  ): Promise<IdempotencyRecord<DepositResponse>> {
    const key = this.helper.requireIdempotencyKey(rawKey);
    const scope = `deposit:user:${userId}`;
    const hash = this.helper.requestHash({ userId, amount });

    return this.prisma.$transaction(async (tx) => {
      // 如果请求已经处理过，直接返回当时保存的响应，不再重复加余额。
      const existing = await this.helper.findStoredIdempotency(scope, key, tx);
      if (existing) {
        return this.helper.parseStoredResponse(existing, hash);
      }

      const user = await this.getUser(userId, tx);
      const nextBalance = user.balance + amount;
      // balance 是当前余额读模型；真实可追溯流水仍然以 ledger_entries 为准。
      await tx.user.update({
        where: { id: userId },
        data: { balance: nextBalance },
      });

      // 充值只追加一条正向账本，不修改历史账务记录。
      const ledger = await tx.ledgerEntry.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          idempotencyKey: key,
          createdAt: nowSql(),
        },
      });

      const body = {
        userId,
        balance: nextBalance,
        ledgerEntryId: ledger.id,
      };

      await this.helper.storeIdempotency(scope, key, hash, 201, body, tx);
      return { status: 201, body };
    });
  }

  /**
   * 根据用户 ID 查询用户，找不到时抛出 404 业务异常。
   */
  async getUser(
    userId: number,
    prisma: PrismaService | TransactionClient = this.prisma,
  ): Promise<UserRow> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, balance: true },
    });

    if (!user) {
      throw new DomainError('User not found', 404);
    }
    return user;
  }
}

type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];
