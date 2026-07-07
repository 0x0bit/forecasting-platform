import { Injectable } from '@nestjs/common';
import { DomainError } from '@common/domain-error';
import { PrismaService } from '@common/prisma/prisma.service';
import type {
  AnomalyRow,
  BetStatusCounts,
  LedgerEntryTypeRow,
  ReconcileResponse,
} from './interfaces/reconcile.interface';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 对指定用户做账务核对，比较记录余额和账本推导余额，并收集异常。
   */
  async reconcile(userId: number): Promise<ReconcileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, initialBalance: true },
    });

    if (!user) {
      throw new DomainError('User not found', 404);
    }

    const ledgerSum = await this.prisma.ledgerEntry.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    // 对账余额不信任 User.balance 本身，而是用初始余额加账本流水重新推导。
    const statusRows = await this.prisma.bet.findMany({
      where: { userId },
      select: { status: true },
    });

    const betStatusCounts: BetStatusCounts = {
      PLACED: 0,
      SETTLED: 0,
      CANCELLED: 0,
    };

    for (const row of statusRows) {
      if (row.status in betStatusCounts) {
        betStatusCounts[row.status as keyof typeof betStatusCounts] += 1;
      }
    }

    // 这里集中检查订单与账本是否匹配，包括缺扣款、重复发奖和缺退款。
    const anomalies = await this.findAnomalies(userId);
    const calculatedBalance =
      user.initialBalance + (ledgerSum._sum.amount ?? 0);

    return {
      userId,
      recordedBalance: user.balance,
      calculatedBalance,
      betStatusCounts,
      isConsistent:
        user.balance === calculatedBalance && anomalies.length === 0,
      anomalies,
    };
  }

  private async findAnomalies(userId: number): Promise<AnomalyRow[]> {
    const bets = await this.prisma.bet.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        result: true,
        ledgerEntries: {
          select: { type: true },
        },
      },
    });

    const anomalies: AnomalyRow[] = [];

    for (const bet of bets) {
      const debitCount = countLedgerEntries(bet.ledgerEntries, 'BET_DEBIT');
      const creditCount = countLedgerEntries(bet.ledgerEntries, 'BET_CREDIT');
      const refundCount = countLedgerEntries(bet.ledgerEntries, 'BET_REFUND');

      if (debitCount === 0) {
        anomalies.push({ betId: bet.id, reason: 'MISSING_BET_DEBIT' });
      }

      if (creditCount > 1) {
        anomalies.push({ betId: bet.id, reason: 'DUPLICATE_BET_CREDIT' });
      }

      if (
        bet.status === 'SETTLED' &&
        bet.result === 'WIN' &&
        creditCount === 0
      ) {
        anomalies.push({ betId: bet.id, reason: 'MISSING_WIN_CREDIT' });
      }

      if (
        bet.status === 'SETTLED' &&
        bet.result === 'LOSE' &&
        creditCount > 0
      ) {
        anomalies.push({ betId: bet.id, reason: 'LOSE_WITH_BET_CREDIT' });
      }

      if (bet.status === 'CANCELLED' && refundCount === 0) {
        anomalies.push({ betId: bet.id, reason: 'MISSING_BET_REFUND' });
      }

      if (refundCount > 1) {
        anomalies.push({ betId: bet.id, reason: 'DUPLICATE_BET_REFUND' });
      }
    }

    return anomalies;
  }
}

function countLedgerEntries(
  ledgerEntries: LedgerEntryTypeRow[],
  type: string,
): number {
  return ledgerEntries.filter((entry) => entry.type === type).length;
}
