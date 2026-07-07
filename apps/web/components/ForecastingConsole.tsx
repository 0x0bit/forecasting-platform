// ForecastingConsole 组件负责协调预测系统操作台的状态、数据刷新和业务动作。
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, makeIdempotencyKey } from '../lib';
import type { Bet, BetResult, ReconcileResult, User } from '../lib';
import { BetForm } from './forecasting/BetForm';
import { BetsTable } from './forecasting/BetsTable';
import { ConsoleHeader } from './forecasting/ConsoleHeader';
import { DepositForm } from './forecasting/DepositForm';
import { formatError } from './forecasting/formatters';
import { MetricsGrid } from './forecasting/MetricsGrid';
import { NoticeBanner } from './forecasting/NoticeBanner';
import { ReconcilePanel } from './forecasting/ReconcilePanel';
import type { Notice } from './forecasting/types';
import { UserSidebar } from './forecasting/UserSidebar';

/**
 * 预测系统前端操作台，整合用户、充值、下注、结算、取消和对账视图。
 */
export function ForecastingConsole() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(1);
  const [bets, setBets] = useState<Bet[]>([]);
  const [reconcile, setReconcile] = useState<ReconcileResult | null>(null);
  const [depositAmount, setDepositAmount] = useState(100);
  const [depositKey, setDepositKey] = useState(() => makeIdempotencyKey('deposit'));
  const [gameId, setGameId] = useState('market-2026-01');
  const [betAmount, setBetAmount] = useState(100);
  const [betKey, setBetKey] = useState(() => makeIdempotencyKey('bet'));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0],
    [selectedUserId, users]
  );

  /**
   * 从后端重新拉取当前用户相关的用户列表、订单列表和对账结果。
   */
  async function refresh(userId = selectedUserId) {
    // 同步刷新用户、订单和对账结果，避免页面局部状态和后端账本不一致。
    const [nextUsers, nextBets, nextReconcile] = await Promise.all([
      api.users(),
      api.bets(userId),
      api.reconcile(userId)
    ]);
    setUsers(nextUsers);
    setBets(nextBets);
    setReconcile(nextReconcile);
  }

  useEffect(() => {
    refresh().catch((error) => {
      setNotice({ kind: 'error', text: formatError(error) });
    });
  }, []);

  /**
   * 包装所有写操作，统一处理加载状态、成功提示、错误提示和刷新。
   */
  async function runAction(action: () => Promise<void>, success: string) {
    // 所有写操作共用同一套忙碌态、错误提示和刷新逻辑。
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await refresh();
      setNotice({ kind: 'success', text: success });
    } catch (error) {
      setNotice({ kind: 'error', text: formatError(error) });
    } finally {
      setBusy(false);
    }
  }

  /**
   * 提交充值表单，并保留当前幂等 Key 供重复提交验证。
   */
  async function submitDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 不自动替换 Key，方便重复点击同一个请求来验证充值幂等。
    await runAction(
      async () => {
        await api.deposit(selectedUserId, depositAmount, depositKey);
      },
      '充值已提交，余额和账本已更新。'
    );
  }

  /**
   * 提交下注表单，并保留当前幂等 Key 供重复提交验证。
   */
  async function submitBet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 不自动替换 Key，方便重复点击同一个请求来验证下注幂等。
    await runAction(
      async () => {
        await api.createBet(selectedUserId, gameId, betAmount, betKey);
      },
      '下注已创建，余额已扣减。'
    );
  }

  /**
   * 按指定结果结算下注订单。
   */
  async function settleBet(betId: number, result: BetResult) {
    await runAction(
      async () => {
        await api.settleBet(betId, result);
      },
      result === 'WIN' ? '已按 WIN 结算并发放奖金。' : '已按 LOSE 结算。'
    );
  }

  /**
   * 取消下注订单并触发后端退款流程。
   */
  async function cancelBet(betId: number) {
    await runAction(
      async () => {
        await api.cancelBet(betId);
      },
      '订单已取消，余额已退款。'
    );
  }

  /**
   * 切换当前用户，并立即刷新目标用户的订单和对账信息。
   */
  async function selectUser(userId: number) {
    // 切换用户时用目标 userId 刷新，避免异步 setState 尚未生效时读到旧用户。
    setSelectedUserId(userId);
    setBusy(true);
    setNotice(null);
    try {
      await refresh(userId);
    } catch (error) {
      setNotice({ kind: 'error', text: formatError(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <ConsoleHeader busy={busy} onRefresh={() => refresh()} />

      <section className="layout">
        <UserSidebar users={users} selectedUserId={selectedUserId} onSelectUser={selectUser} />

        <section className="content">
          <MetricsGrid selectedUser={selectedUser} bets={bets} reconcile={reconcile} />
          <NoticeBanner notice={notice} />

          <div className="actionsGrid">
            <DepositForm
              amount={depositAmount}
              idempotencyKey={depositKey}
              busy={busy}
              onAmountChange={setDepositAmount}
              onKeyChange={setDepositKey}
              onSubmit={submitDeposit}
            />
            <BetForm
              gameId={gameId}
              amount={betAmount}
              idempotencyKey={betKey}
              busy={busy}
              onGameIdChange={setGameId}
              onAmountChange={setBetAmount}
              onKeyChange={setBetKey}
              onSubmit={submitBet}
            />
          </div>

          <BetsTable bets={bets} busy={busy} onSettleBet={settleBet} onCancelBet={cancelBet} />
          <ReconcilePanel reconcile={reconcile} />
        </section>
      </section>
    </main>
  );
}
