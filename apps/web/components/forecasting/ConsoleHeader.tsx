// ConsoleHeader 组件展示操作台标题，并提供全局刷新按钮。
import { RefreshCcw } from 'lucide-react';

type ConsoleHeaderProps = {
  busy: boolean;
  onRefresh: () => void;
};

export function ConsoleHeader({ busy, onRefresh }: ConsoleHeaderProps) {
  return (
    <section className="topbar">
      <div>
        <h1>Forecasting Console</h1>
        <p>账户余额、下注状态机和账本对账工作台</p>
      </div>
      <button className="iconButton" type="button" onClick={onRefresh} disabled={busy} title="刷新">
        <RefreshCcw size={18} />
      </button>
    </section>
  );
}
