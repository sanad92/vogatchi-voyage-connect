
import { useInvoicesData } from './invoices/useInvoicesData';
import { useInvoiceActions } from './invoices/useInvoiceActions';
import { useInvoiceStats } from './invoices/useInvoiceStats';

export type { InvoiceFilters } from './invoices/useInvoicesData';

export const useInvoicesManagement = (filters?: import('./invoices/useInvoicesData').InvoiceFilters) => {
  const { data: invoices, isLoading, error } = useInvoicesData(filters);
  const { 
    updateStatus, 
    deleteInvoice, 
    updateInvoice, 
    isUpdatingStatus, 
    isDeletingInvoice, 
    isUpdatingInvoice 
  } = useInvoiceActions();
  const invoiceStats = useInvoiceStats(invoices || []);

  return {
    invoices,
    isLoading,
    error,
    updateStatus,
    deleteInvoice,
    updateInvoice,
    isUpdatingStatus,
    isDeletingInvoice,
    isUpdatingInvoice,
    invoiceStats,
  };
};
