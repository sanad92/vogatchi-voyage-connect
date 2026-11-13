import type { RefundBalance } from '@/hooks/finance/useRefundBalances';

export function isOpenRefund(row: RefundBalance) {
  return ['requested', 'pending', 'approved', 'confirmed'].includes(row.status);
}

export function isRefundFollowUpOverdue(row: RefundBalance, today: string) {
  return isOpenRefund(row) && !!row.followUpOn && row.followUpOn < today;
}

export function compareRefundFollowUps(a: RefundBalance, b: RefundBalance) {
  return (a.followUpOn ?? '9999-12-31').localeCompare(b.followUpOn ?? '9999-12-31')
    || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}
