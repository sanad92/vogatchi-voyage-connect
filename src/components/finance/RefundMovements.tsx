import type { RefundBalance } from '@/hooks/finance/useRefundBalances';
import { refundSettlementLabel } from '@/lib/partyWalletMovements';

export const formatRefundAmount = (amount: number, currency: string) =>
  `${Number(amount).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;

export const refundStatusLabels: Record<string, string> = {
  approved: 'مستحق للعميل',
  paid: 'تمت التسوية',
  pending: 'بانتظار تأكيد المورد',
  confirmed: 'رصيد مؤكد',
  rejected: 'مرفوض',
  settled: 'تمت التسوية',
};

export function RefundMovements({ balance }: { balance: RefundBalance }) {
  if (balance.movements.length === 0) return null;

  return (
    <details>
      <summary className="cursor-pointer text-primary">
        <span>حركات التسوية</span> ({balance.movements.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {[...balance.movements].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(movement => (
          <li key={movement.id} className="flex flex-wrap gap-x-3">
            <time dateTime={movement.created_at}>{new Date(movement.created_at).toLocaleDateString('ar-EG')}</time>
            <span>{refundSettlementLabel(balance.kind, movement)}</span>
            <strong>{formatRefundAmount(movement.amount, balance.currency)}</strong>
            <span>{movement.invoice?.invoice_number || movement.order?.reference_number || movement.treasury?.account_name}</span>
            {movement.reference && <span>{movement.reference}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
