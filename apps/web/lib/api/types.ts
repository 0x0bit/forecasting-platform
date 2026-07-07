// API 类型定义文件，集中描述后端返回给前端的数据结构。
export type User = {
  id: number;
  username: string;
  balance: number;
  initialBalance: number;
  createdAt: string;
};

export type BetStatus = 'PLACED' | 'SETTLED' | 'CANCELLED';
export type BetResult = 'WIN' | 'LOSE';

export type Bet = {
  id: number;
  userId: number;
  gameId: string;
  amount: number;
  status: BetStatus;
  result?: BetResult;
  payoutAmount?: number;
  balance?: number;
  createdAt?: string;
};

export type DepositResponse = {
  userId: number;
  balance: number;
  ledgerEntryId: number;
};

export type ReconcileResult = {
  userId: number;
  recordedBalance: number;
  calculatedBalance: number;
  betStatusCounts: Record<BetStatus, number>;
  isConsistent: boolean;
  anomalies: Array<{
    betId: number;
    reason: string;
  }>;
};
