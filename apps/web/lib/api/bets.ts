// 下注 API 文件，封装下注列表、创建、结算和取消请求。
import { requestJson } from './client';
import type { Bet, BetResult } from './types';

export function bets(userId: number): Promise<Bet[]> {
  return requestJson<Bet[]>(`/bets?userId=${userId}`);
}

export function createBet(
  userId: number,
  gameId: string,
  amount: number,
  idempotencyKey: string
): Promise<Bet> {
  return requestJson<Bet>('/bets', {
    method: 'POST',
    idempotencyKey,
    body: JSON.stringify({ userId, gameId, amount })
  });
}

export function settleBet(betId: number, result: BetResult): Promise<Bet> {
  return requestJson<Bet>(`/bets/${betId}/settle`, {
    method: 'POST',
    body: JSON.stringify({ result })
  });
}

export function cancelBet(betId: number): Promise<Bet> {
  return requestJson<Bet>(`/bets/${betId}/cancel`, {
    method: 'POST'
  });
}
