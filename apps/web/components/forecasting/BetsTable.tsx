// BetsTable 组件展示当前用户订单，并提供结算和取消操作。
import { BadgeCheck, Ban, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Bet, BetResult } from '../../lib';
import {
  formatMoney,
  outcomeAmountClassName,
  outcomeAmountText,
  statusClassName,
  statusText
} from './formatters';

type BetsTableProps = {
  bets: Bet[];
  busy: boolean;
  onSettleBet: (betId: number, result: BetResult) => void;
  onCancelBet: (betId: number) => void;
};

export function BetsTable({ bets, busy, onSettleBet, onCancelBet }: BetsTableProps) {
  return (
    <section className="panel tablePanel">
      <div className="panelHeader spread">
        <div>
          <div className="panelHeader inline">
            <ShieldCheck size={18} />
            <h2>订单</h2>
          </div>
        </div>
        <span className="muted">{bets.length} 条</span>
      </div>
      <div className="table">
        <div className="tableHead">
          <span>ID</span>
          <span>Game</span>
          <span>支出</span>
          <span>状态</span>
          <span>输赢金额</span>
          <span>操作</span>
        </div>
        {bets.map((bet) => (
          <div className="tableRow" key={bet.id}>
            <span>#{bet.id}</span>
            <span>{bet.gameId}</span>
            <span>{formatMoney(bet.amount)}</span>
            <span className={statusClassName(bet)}>{statusText(bet)}</span>
            <span className={outcomeAmountClassName(bet)}>{outcomeAmountText(bet)}</span>
            <span className="rowActions">
              <button
                className="actionButton"
                type="button"
                disabled={busy || bet.status !== 'PLACED'}
                onClick={() => onSettleBet(bet.id, 'WIN')}
              >
                <BadgeCheck size={16} />
                <span>WIN</span>
              </button>
              <button
                className="actionButton"
                type="button"
                disabled={busy || bet.status !== 'PLACED'}
                onClick={() => onSettleBet(bet.id, 'LOSE')}
              >
                <Ban size={16} />
                <span>LOSE</span>
              </button>
              <button
                className="actionButton"
                type="button"
                disabled={busy || bet.status !== 'PLACED'}
                onClick={() => onCancelBet(bet.id)}
              >
                <RotateCcw size={16} />
                <span>取消</span>
              </button>
            </span>
          </div>
        ))}
        {bets.length === 0 ? <div className="empty">当前用户暂无订单</div> : null}
      </div>
    </section>
  );
}
