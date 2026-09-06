import { useQuery } from '@tanstack/react-query';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export interface ExecutiveKpiGroup {
  id: string | null;
  name: string;
  booking_count: number;
  selling: number;
  supplier_cost?: number;
  net_contribution: number;
  margin_pct: number;
}

export interface ExecutiveKpiDashboard {
  filters: {
    organization_id: string;
    start_date: string;
    end_date: string;
    currency: string;
    previous_start_date: string;
    previous_end_date: string;
  };
  summary: {
    bookings_count: number;
    period_bookings_count: number;
    pending_count: number;
    confirmed_count: number;
    cancelled_count: number;
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
    supplier_invoiced: number;
    supplier_paid: number;
    supplier_remaining: number;
    financially_complete_count: number;
    financially_open_count: number;
    loss_bookings_count: number;
    financial_completion_pct: number;
  };
  comparison: {
    previous_bookings_count: number;
    previous_selling: number;
    previous_net_contribution: number;
    selling_change_pct: number | null;
    net_change_pct: number | null;
  };
  monthly: Array<{ month: string; bookings_count: number; selling: number; gross_profit: number; net_contribution: number }>;
  by_type: ExecutiveKpiGroup[];
  by_employee: ExecutiveKpiGroup[];
  by_customer: ExecutiveKpiGroup[];
  by_supplier: ExecutiveKpiGroup[];
  attention_bookings: Array<{
    id: string;
    booking_number: string;
    booking_type: string | null;
    customer_name: string;
    supplier_name: string;
    start_date: string;
    selling: number;
    net_contribution: number;
    customer_remaining: number;
    supplier_remaining: number;
    financially_complete: boolean;
    warnings: string[];
    risk_score: number;
  }>;
}

export const useExecutiveKpis = (
  orgId: string | undefined,
  startDate: string,
  endDate: string,
  currency: string,
) => useQuery({
  queryKey: ['executive-kpi-dashboard', orgId, startDate, endDate, currency],
  enabled: Boolean(orgId && startDate && endDate && startDate <= endDate),
  queryFn: async () => {
    const { data, error } = await callUntypedRpc<ExecutiveKpiDashboard>('get_executive_kpi_dashboard', {
      _org_id: orgId,
      _start_date: startDate,
      _end_date: endDate,
      _currency: currency,
    });
    if (error) throw error;
    return data;
  },
});
