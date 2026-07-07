// ReconcilePanel 组件展示账务对账结果和异常列表。
import { AlertTriangle } from 'lucide-react';
import type { ReconcileResult } from '../../lib';
import { formatMoney } from './formatters';

type ReconcilePanelProps = {
  reconcile: ReconcileResult | null;
};

export function ReconcilePanel({ reconcile }: ReconcilePanelProps) {
  return (
    <section className="panel reconcilePanel">
      <div className="panelHeader">
        <AlertTriangle size={18} />
        <h2>对账</h2>
      </div>
      {reconcile ? (
        <div className="reconcileGrid">
          <div>
            <span>记录余额</span>
            <strong>{formatMoney(reconcile.recordedBalance)}</strong>
          </div>
          <div>
            <span>账本推导余额</span>
            <strong>{formatMoney(reconcile.calculatedBalance)}</strong>
          </div>
          <div>
            <span>PLACED</span>
            <strong>{reconcile.betStatusCounts.PLACED}</strong>
          </div>
          <div>
            <span>SETTLED</span>
            <strong>{reconcile.betStatusCounts.SETTLED}</strong>
          </div>
          <div>
            <span>CANCELLED</span>
            <strong>{reconcile.betStatusCounts.CANCELLED}</strong>
          </div>
        </div>
      ) : null}
      <div className="anomalies">
        {reconcile?.anomalies.length ? (
          reconcile.anomalies.map((item) => (
            <span className="anomaly" key={`${item.betId}-${item.reason}`}>
              #{item.betId} {item.reason}
            </span>
          ))
        ) : (
          <span className="muted">未发现账务异常</span>
        )}
      </div>
    </section>
  );
}
