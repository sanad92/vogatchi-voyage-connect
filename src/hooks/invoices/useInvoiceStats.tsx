
export const useInvoiceStats = (invoices: any[]) => {
  const getInvoiceStats = () => {
    if (!invoices) return null;

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
    const outstandingAmount = totalAmount - paidAmount;

    return {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      pendingInvoices,
      totalAmount,
      paidAmount,
      outstandingAmount,
    };
  };

  return { getInvoiceStats };
};
