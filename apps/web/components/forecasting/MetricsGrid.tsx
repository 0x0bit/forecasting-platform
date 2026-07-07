// MetricsGrid 组件展示当前用户余额、初始余额、进行中订单和账本状态。
import type { Bet, ReconcileResult, User } from '../../lib';
import { formatMoney } from './formatters';

type MetricsGridProps = {
  selectedUser?: User;
  bets: Bet[];
  reconcile: ReconcileResult | null;
};

export function MetricsGrid({ selectedUser, bets, reconcile }: MetricsGridProps) {
  if (!selectedUser) {
    return null;
  }

  const placedBets = bets.filter((bet) => bet.status === 'PLACED');

  return (
    <div className="metrics">
      <div className="metric">
        <span>当前余额</span>
        <strong>{formatMoney(selectedUser.balance)}</strong>
      </div>
      <div className="metric">
        <span>初始余额</span>
        <strong>{formatMoney(selectedUser.initialBalance)}</strong>
      </div>
      <div className="metric">
        <span>进行中订单</span>
        <strong>{placedBets.length}</strong>
      </div>
      <div className={reconcile?.isConsistent ? 'metric ok' : 'metric warn'}>
        <span>账本状态</span>
        <strong>{reconcile?.isConsistent ? '一致' : '异常'}</strong>
      </div>
    </div>
  );
}
