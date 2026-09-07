export function paymentOrderBalance(amount: number, allocations: Array<{ amount: number }> = []) {
  const paidAmount = allocations.reduce((total, row) => total + Number(row.amount), 0);
  return { paidAmount, remainingAmount: Math.max(0, Math.round((Number(amount) - paidAmount) * 100) / 100) };
}

export function canPayOrder(order: { approval_status: string; status: string; remainingAmount: number }) {
  return order.approval_status === 'approved'
    && ['approved', 'pending', 'partially_paid'].includes(order.status)
    && order.remainingAmount > 0;
}
