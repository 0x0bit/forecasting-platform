import type { BetStatus } from '../../bets/interfaces/bet.interface';

export interface BetStatusCounts extends Record<BetStatus, number> {
  PLACED: number;
  SETTLED: number;
  CANCELLED: number;
}

export interface AnomalyRow {
  betId: number;
  reason: string;
}

export interface ReconcileResponse {
  userId: number;
  recordedBalance: number;
  calculatedBalance: number;
  betStatusCounts: BetStatusCounts;
  isConsistent: boolean;
  anomalies: AnomalyRow[];
}

export interface LedgerEntryTypeRow {
  type: string;
}
