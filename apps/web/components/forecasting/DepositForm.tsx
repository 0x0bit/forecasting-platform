// DepositForm 组件提供用户充值表单和幂等 Key 切换操作。
import { Check, CircleDollarSign, RotateCcw } from 'lucide-react';
import { FormEvent } from 'react';
import { makeIdempotencyKey } from '../../lib';

type DepositFormProps = {
  amount: number;
  idempotencyKey: string;
  busy: boolean;
  onAmountChange: (amount: number) => void;
  onKeyChange: (key: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function DepositForm({
  amount,
  idempotencyKey,
  busy,
  onAmountChange,
  onKeyChange,
  onSubmit
}: DepositFormProps) {
  return (
    <form className="panel" onSubmit={onSubmit}>
      <div className="panelHeader">
        <CircleDollarSign size={18} />
        <h2>充值</h2>
      </div>
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
          <span>提交充值</span>
        </button>
        <button className="secondaryButton" type="button" onClick={() => onKeyChange(makeIdempotencyKey('deposit'))}>
          <RotateCcw size={16} />
          <span>换 Key</span>
        </button>
      </div>
    </form>
  );
}
