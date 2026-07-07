export type BetStatus = 'PLACED' | 'SETTLED' | 'CANCELLED';

export type BetResult = 'WIN' | 'LOSE';

export interface BetRow {
  id: number;
  userId: number;
  gameId: string;
  amount: number;
  status: BetStatus;
  result: BetResult | null;
  payoutAmount: number | null;
}

export interface BetListItem {
  id: number;
  userId: number;
  gameId: string;
  amount: number;
  status: BetStatus;
  result?: BetResult;
  payoutAmount?: number;
  createdAt: string;
}

export interface BetResponse {
  id: number;
  userId: number;
  gameId: string;
  amount: number;
  status: BetStatus;
  result?: BetResult;
  payoutAmount?: number;
  balance: number;
}
