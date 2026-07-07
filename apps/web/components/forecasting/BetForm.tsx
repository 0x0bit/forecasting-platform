// BetForm 组件提供创建下注订单的表单和幂等 Key 切换操作。
import { Check, Play, RotateCcw } from 'lucide-react';
import { FormEvent } from 'react';
import { makeIdempotencyKey } from '../../lib';

type BetFormProps = {
  gameId: string;
  amount: number;
  idempotencyKey: string;
  busy: boolean;
  onGameIdChange: (gameId: string) => void;
  onAmountChange: (amount: number) => void;
  onKeyChange: (key: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function BetForm({
  gameId,
  amount,
  idempotencyKey,
  busy,
  onGameIdChange,
  onAmountChange,
  onKeyChange,
  onSubmit
}: BetFormProps) {
  return (
    <form className="panel" onSubmit={onSubmit}>
      <div className="panelHeader">
        <Play size={18} />
        <h2>下注</h2>
      </div>
      <label>
        Game ID
        <input value={gameId} onChange={(event) => onGameIdChange(event.target.value)} />
      </label>
      <label>
        金额
        <input min={1} type="number" value={amount} onChange={(event) => onAmountChange(Number(event.target.value))} />
      </label>
      <label>
        Idempotency-Key
        <input value={idempotencyKey} onChange={(event) => onKeyChange(event.target.value)} />
      </label>
      <div className="buttonRow">
        <button className="primaryButton" type="submit" disabled={busy}>
          <Check size={16} />
          <span>创建下注</span>
        </button>
        <button className="secondaryButton" type="button" onClick={() => onKeyChange(makeIdempotencyKey('bet'))}>
          <RotateCcw size={16} />
          <span>换 Key</span>
        </button>
      </div>
    </form>
  );
}
