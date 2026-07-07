// 用户 API 文件，封装用户列表和充值请求。
import { requestJson } from './client';
import type { DepositResponse, User } from './types';

export function users(): Promise<User[]> {
  return requestJson<User[]>('/users');
}

export function deposit(
  userId: number,
  amount: number,
  idempotencyKey: string
): Promise<DepositResponse> {
  return requestJson<DepositResponse>(`/users/${userId}/deposit`, {
    method: 'POST',
    idempotencyKey,
    body: JSON.stringify({ amount })
  });
}
