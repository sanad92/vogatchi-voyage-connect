import type { RefundBalance } from '@/hooks/finance/useRefundBalances';

export interface WalletDocumentLink {
  kind: 'invoice' | 'booking' | 'paymentOrder' | 'refund';
  id: string;
  label: string;
}

export function walletDocumentPath(link: WalletDocumentLink, partyKind: RefundBalance['kind']) {
  const id = encodeURIComponent(link.id);
  switch (link.kind) {
    case 'invoice': return `/invoices?id=${id}`;
    case 'booking': return `/bookings/${id}/workspace?tab=financials`;
    case 'paymentOrder': return `/payment-orders?id=${id}`;
    case 'refund': return `/refund-balances?kind=${partyKind}&view=all&refund=${id}`;
  }
}

export interface PartyWalletMovement {
  id: string;
  date: string | null;
  label: string;
  amount: number;
  currency: string;
  balanceDelta: number;
  cashDirection?: 'in' | 'out';
  treasuryName?: string | null;
  document?: string | null;
  reference?: string | null;
  links?: WalletDocumentLink[];
  paymentMethod?: string | null;
  payment?: boolean;
}

const refundLabels: Record<string, string> = {
  requested: 'طلب استرداد العميل',
  pending: 'مطالبة مورد بانتظار التأكيد',
  approved: 'اعتماد استرداد العميل',
  paid: 'اعتماد استرداد العميل',
  confirmed: 'تأكيد رصيد لدى المورد',
  settled: 'تأكيد رصيد لدى المورد',
  rejected: 'رفض طلب الاسترداد',
  cancelled: 'إلغاء طلب الاسترداد',
};

export function refundSettlementLabel(kind: RefundBalance['kind'], movement: RefundBalance['movements'][number]) {
  if (movement.invoice_id) return 'تسوية على فاتورة';
  if (movement.supplier_order_id) return 'خصم من أمر دفع';
  return kind === 'customer' ? 'صرف استرداد للعميل' : 'تحصيل استرداد من المورد';
}

export function listPartyWalletMovements(payments: PartyWalletMovement[], refunds: RefundBalance[]) {
  const rows = [...payments];
  for (const refund of refunds) {
    const amount = Number(refund.amount);
    const directPayout = refund.kind === 'customer' && refund.status === 'paid' && !refund.movements.length;
    const affectsBalance = !refund.pilgrimageB2B && ['approved', 'paid', 'confirmed', 'settled'].includes(refund.status);
    const refundLink: WalletDocumentLink = {
      kind: 'refund', id: refund.id, label: refund.kind === 'customer' ? 'فتح طلب الاسترداد' : 'فتح مطالبة الاسترداد',
    };
    rows.push({
      id: `refund:${refund.id}`,
      date: directPayout ? refund.paidAt ?? null : refund.decisionAt ?? refund.createdAt,
      label: directPayout
        ? refund.pilgrimageB2B ? 'صرف استرداد حج وعمرة للشريك' : 'صرف استرداد للعميل'
        : refundLabels[refund.status] ?? 'طلب استرداد',
      amount,
      currency: refund.currency,
      balanceDelta: affectsBalance && !directPayout ? amount : 0,
      cashDirection: directPayout ? 'out' : undefined,
      treasuryName: directPayout ? refund.treasuryName : undefined,
      document: refund.source,
      reference: refund.reference,
      links: [
        refundLink,
        ...(refund.invoiceId && refund.invoiceNumber ? [{
          kind: 'invoice' as const, id: refund.invoiceId, label: refund.invoiceNumber,
        }] : []),
        ...(refund.bookingId && refund.bookingNumber ? [{
          kind: 'booking' as const, id: refund.bookingId, label: refund.bookingNumber,
        }] : []),
      ],
    });

    for (const settlement of refund.movements) {
      const settledAmount = Number(settlement.amount);
      rows.push({
        id: `settlement:${settlement.id}`,
        date: settlement.created_at,
        label: refundSettlementLabel(refund.kind, settlement),
        amount: settledAmount,
        currency: refund.currency,
        balanceDelta: -settledAmount,
        cashDirection: settlement.treasury_account_id ? refund.kind === 'customer' ? 'out' : 'in' : undefined,
        treasuryName: settlement.treasury?.account_name,
        document: settlement.invoice?.invoice_number ?? settlement.order?.reference_number ?? refund.source,
        reference: settlement.reference,
        links: [
          ...(settlement.invoice_id && settlement.invoice ? [{
            kind: 'invoice' as const, id: settlement.invoice_id, label: settlement.invoice.invoice_number,
          }] : []),
          ...(settlement.supplier_order_id && settlement.order ? [{
            kind: 'paymentOrder' as const, id: settlement.supplier_order_id, label: settlement.order.reference_number,
          }] : []),
          refundLink,
        ],
      });
    }
  }

  return rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.id.localeCompare(b.id));
}
