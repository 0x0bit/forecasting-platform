import { Injectable } from '@nestjs/common';
import { DomainError } from '@common/domain-error';
import { HelperService, IdempotencyRecord } from '@common/helpers/helper.service';
import { PrismaService, nowSql } from '@common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateBetDto } from './dto';
import type {
  BetListItem,
  BetResponse,
  BetResult,
  BetRow,
  BetStatus,
} from './interfaces/bet.interface';

@Injectable()
export class BetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly helper: HelperService,
  ) {}

  /**
   * 查询下注列表，可按用户过滤，返回给前端展示订单状态。
   */
  async list(userId?: number): Promise<BetListItem[]> {
    if (userId !== undefined && !Number.isInteger(userId)) {
      throw new DomainError('userId must be an integer', 400);
    }

    const rows = await this.prisma.bet.findMany({
      where: userId === undefined ? undefined : { userId },
      orderBy: { id: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      gameId: row.gameId,
      amount: row.amount,
      status: row.status as BetStatus,
      result: (row.result as BetResult | null) ?? undefined,
      payoutAmount: row.payoutAmount ?? undefined,
      createdAt: row.createdAt,
    }));
  }

  /**
   * 创建下注：检查幂等、校验余额、扣减余额、创建订单并追加扣款账本。
   */
  async create(
    body: CreateBetDto,
    rawKey?: string,
  ): Promise<IdempotencyRecord<BetResponse>> {
    const key = this.helper.requireIdempotencyKey(rawKey);
    const scope = `bet:user:${body.userId}`;
    const hash = this.helper.requestHash(body);

    return this.prisma.$transaction(async (tx) => {
      // 重放相同下注请求时返回第一次创建的订单，避免重复扣款。
      const existing = await this.helper.findStoredIdempotency(scope, key, tx);
      if (existing) {
        return this.helper.parseStoredResponse<BetResponse>(existing, hash);
      }

      const user = await this.usersService.getUser(body.userId, tx);
      // 下单前先检查余额，严禁出现负余额。
      if (user.balance < body.amount) {
        throw new DomainError('Insufficient balance', 400);
      }

      const nextBalance = user.balance - body.amount;
      await tx.user.update({
        where: { id: user.id },
        data: { balance: nextBalance },
      });

      const bet = await tx.bet.create({
        data: {
          userId: user.id,
          gameId: body.gameId,
          amount: body.amount,
          status: 'PLACED',
          createdAt: nowSql(),
        },
      });

      // 下注扣款用负数入账，便于对账时直接 SUM(amount) 推导余额。
      await tx.ledgerEntry.create({
        data: {
          userId: user.id,
          betId: bet.id,
          type: 'BET_DEBIT',
          amount: -body.amount,
          idempotencyKey: key,
          createdAt: nowSql(),
        },
      });

      const response = {
        id: bet.id,
        userId: user.id,
        gameId: body.gameId,
        amount: body.amount,
        status: 'PLACED' as const,
        balance: nextBalance,
      };

      await this.helper.storeIdempotency(scope, key, hash, 201, response, tx);
      return { status: 201, body: response };
    });
  }

  /**
   * 结算下注：仅允许 PLACED 到 SETTLED，WIN 时追加奖金账本。
   */
  async settle(betId: number, result: BetResult): Promise<BetResponse> {
    return this.prisma.$transaction(async (tx) => {
      const bet = await this.getBet(betId, tx);
      // SETTLED 和 CANCELLED 都是终态，不能再次结算或改状态。
      if (bet.status !== 'PLACED') {
        throw new DomainError('Only PLACED bets can be settled', 409);
      }

      const user = await this.usersService.getUser(bet.userId, tx);
      // WIN 返还本金并发放等额盈利；LOSE 不产生余额返还。
      const payoutAmount = result === 'WIN' ? bet.amount * 2 : 0;
      const nextBalance = user.balance + payoutAmount;

      await tx.bet.update({
        where: { id: betId },
        data: {
          status: 'SETTLED',
          result,
          payoutAmount,
          settledAt: nowSql(),
        },
      });

      if (payoutAmount > 0) {
        // 只有 WIN 才追加奖金账本；LOSE 仅更新订单状态。
        await tx.ledgerEntry.create({
          data: {
            userId: bet.userId,
            betId,
            type: 'BET_CREDIT',
            amount: payoutAmount,
            createdAt: nowSql(),
          },
        });
        await tx.user.update({
          where: { id: bet.userId },
          data: { balance: nextBalance },
        });
      }

      return {
        id: bet.id,
        userId: bet.userId,
        gameId: bet.gameId,
        amount: bet.amount,
        status: 'SETTLED',
        result,
        payoutAmount,
        balance: nextBalance,
      };
    });
  }

  /**
   * 取消下注：仅允许 PLACED 到 CANCELLED，并追加退款账本。
   */
  async cancel(betId: number): Promise<BetResponse> {
    return this.prisma.$transaction(async (tx) => {
      const bet = await this.getBet(betId, tx);
      // 取消只能发生在 PLACED，避免对已结算订单重复退款。
      if (bet.status !== 'PLACED') {
        throw new DomainError('Only PLACED bets can be cancelled', 409);
      }

      const user = await this.usersService.getUser(bet.userId, tx);
      const nextBalance = user.balance + bet.amount;

      await tx.bet.update({
        where: { id: betId },
        data: {
          status: 'CANCELLED',
          canceledAt: nowSql(),
        },
      });
      // 退款作为独立账本追加，和原 BET_DEBIT 保持可审计的配对关系。
      await tx.ledgerEntry.create({
        data: {
          userId: bet.userId,
          betId,
          type: 'BET_REFUND',
          amount: bet.amount,
          createdAt: nowSql(),
        },
      });
      await tx.user.update({
        where: { id: bet.userId },
        data: { balance: nextBalance },
      });

      return {
        id: bet.id,
        userId: bet.userId,
        gameId: bet.gameId,
        amount: bet.amount,
        status: 'CANCELLED',
        balance: nextBalance,
      };
    });
  }

  /**
   * 根据订单 ID 查询下注记录，找不到时抛出 404。
   */
  private async getBet(
    betId: number,
    prisma: PrismaService | TransactionClient = this.prisma,
  ): Promise<BetRow> {
    const bet = await prisma.bet.findUnique({
      where: { id: betId },
    });
    if (!bet) {
      throw new DomainError('Bet not found', 404);
    }
    return {
      id: bet.id,
      userId: bet.userId,
      gameId: bet.gameId,
      amount: bet.amount,
      status: bet.status as BetStatus,
      result: bet.result as BetResult | null,
      payoutAmount: bet.payoutAmount,
    };
  }
}

type TransactionClient = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];
