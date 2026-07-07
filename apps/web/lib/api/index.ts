// API 模块入口，导出前端调用后端所需的类型、接口方法和工具函数。
export * from './admin';
export * from './bets';
export * from './client';
export * from '../helper';
export * from './types';
export * from './users';

import { reconcile } from './admin';
import { bets, cancelBet, createBet, settleBet } from './bets';
import { deposit, users } from './users';

export const api = {
  users,
  bets,
  deposit,
  createBet,
  settleBet,
  cancelBet,
  reconcile
};
