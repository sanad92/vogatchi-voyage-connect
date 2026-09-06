import { useQuery } from '@tanstack/react-query';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export interface BookingProfitLine {
  id: string;
  number?: string | null;
  date?: string | null;
  description?: string | null;
  amount?: number | null;
  paid?: number | null;
  debit?: number | null;
  credit?: number | null;
  rate?: number | null;
  status?: string | null;
  currency?: string | null;
}

export interface BookingProfitCockpit {
  booking: {
    id: string;
    booking_number: string | null;
    status: string | null;
    customer_name: string | null;
    supplier_name: string | null;
    currency: string;
  };
  summary: {
    selling: number;
    supplier_cost: number;
    gross_profit: number;
    gross_margin_pct: number;
    direct_expenses: number;
    commissions: number;
    net_contribution: number;
    net_margin_pct: number;
    customer_invoiced: number;
    customer_collected: number;
    customer_remaining: number;
    customer_due_basis: 'customer_invoices' | 'booking_selling';
    supplier_invoiced: number;
    supplier_paid: number;
    supplier_remaining: number;
    supplier_due_basis: 'supplier_invoices' | 'booking_cost';
  };
  settlement: {
    customer_settled: boolean;
    supplier_settled: boolean;
    financially_complete: boolean;
    customer_progress_pct: number;
    supplier_progress_pct: number;
  };
  ledger: {
    posted_revenue: number;
    posted_cost: number;
    posted_expenses: number;
    posted_net: number;
    journal_count: number;
  };
  warnings: string[];
  drilldowns: {
    invoices: BookingProfitLine[];
    customer_payments: BookingProfitLine[];
    supplier_invoices: BookingProfitLine[];
    supplier_payments: BookingProfitLine[];
    expenses: BookingProfitLine[];
    commissions: BookingProfitLine[];
    journals: BookingProfitLine[];
  };
}

export const useBookingProfitCockpit = (bookingId?: string) => useQuery({
  queryKey: ['booking-profit-cockpit', bookingId],
  enabled: Boolean(bookingId),
  queryFn: async () => {
    const { data, error } = await callUntypedRpc<BookingProfitCockpit>('get_booking_profit_cockpit', {
      _booking: bookingId,
    });
    if (error) throw error;
    return data;
  },
});
