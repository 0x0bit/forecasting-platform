// 管理 API 文件，封装账务对账请求。
import { requestJson } from './client';
import type { ReconcileResult } from './types';

export function reconcile(userId: number): Promise<ReconcileResult> {
  return requestJson<ReconcileResult>(`/admin/reconcile?userId=${userId}`);
}
