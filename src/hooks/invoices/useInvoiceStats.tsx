
import { useMemo } from 'react';

export const useInvoiceStats = (invoices: any[]) => {
  const invoiceStats = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        totalInvoices: 0,
        paidInvoices: 0,
        partiallyPaidInvoices: 0,
        unpaidInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
      };
    }

    const stats = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(inv => inv.payment_status === 'fully_paid').length,
      partiallyPaidInvoices: invoices.filter(inv => inv.payment_status === 'partially_paid').length,
      unpaidInvoices: invoices.filter(inv => inv.payment_status === 'unpaid').length,
      overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length,
      totalAmount: invoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0),
      totalPaidAmount: invoices.reduce((sum, inv) => sum + (inv.total_paid_amount || 0), 0),
      totalRemainingAmount: invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0),
    };

    return stats;
  }, [invoices]);

  return invoiceStats;
};
