
import { useInvoicesData, InvoiceFilters } from './invoices/useInvoicesData';
import { useInvoiceActions } from './invoices/useInvoiceActions';
import { useInvoiceStats } from './invoices/useInvoiceStats';

export { InvoiceFilters };

export const useInvoicesManagement = (filters?: InvoiceFilters) => {
  const { data: invoices, isLoading, error } = useInvoicesData(filters);
  const { 
    updateStatus, 
    deleteInvoice, 
    updateInvoice, 
    isUpdatingStatus, 
    isDeletingInvoice, 
    isUpdatingInvoice 
  } = useInvoiceActions();
  const { getInvoiceStats } = useInvoiceStats(invoices || []);

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
    getInvoiceStats,
  };
};
