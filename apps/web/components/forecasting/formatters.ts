// 前端展示格式化文件，提供金额、错误和订单状态的展示文本。
import { ApiError } from '../../lib';
import type { Bet } from '../../lib';

/**
 * 将整数余额格式化为页面展示用的美元金额。
 */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * 将未知异常转换为可展示的错误文案。
 */
export function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.status}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '请求失败';
}

/**
 * 组合订单状态和结算结果，生成表格中的状态文本。
 */
export function statusText(bet: Bet): string {
  if (bet.status === 'SETTLED' && bet.result) {
    return `${bet.status} ${bet.result}`;
  }
  return bet.status;
}

/**
 * 根据订单状态和结算结果生成状态标签样式类。
 */
export function statusClassName(bet: Bet): string {
  if (bet.status === 'SETTLED' && bet.result === 'LOSE') {
    return 'status settledLose';
  }
  return `status ${bet.status.toLowerCase()}`;
}

/**
 * 根据结算结果生成订单输赢金额文本。
 */
export function outcomeAmountText(bet: Bet): string {
  if (bet.status !== 'SETTLED' || !bet.result) {
    return '-';
  }
  if (bet.result === 'WIN') {
    return `+${formatMoney(bet.payoutAmount ?? 0)}`;
  }
  return `-${formatMoney(bet.amount)}`;
}

/**
 * 根据结算结果生成订单输赢金额样式类。
 */
export function outcomeAmountClassName(bet: Bet): string {
  if (bet.status !== 'SETTLED' || !bet.result) {
    return 'outcomeAmount muted';
  }
  return bet.result === 'WIN' ? 'outcomeAmount win' : 'outcomeAmount lose';
}
