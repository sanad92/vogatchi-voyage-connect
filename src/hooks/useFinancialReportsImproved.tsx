/**
 * تقارير مالية مفصّلة: كل صف يحتفظ بعملته الأصلية بدون تحويل.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { SupportedCurrency } from '@/types/currency';

export interface ExpenseBreakdown {
  category_name: string;
  category_name_ar: string;
  total_amount: number;
  transaction_count: number;
  currency: SupportedCurrency;
}

export interface RevenueBreakdown {
  booking_type: string;
  total_revenue: number;
  booking_count: number;
  currency: SupportedCurrency;
}

export interface CurrencySummary {
  currency: SupportedCurrency;
  revenue: number;
  expenses: number;
  salaries: number;
  rent: number;
  net_profit: number;
}

export const useFinancialReportsImproved = (startDate?: string, endDate?: string) => {
  const orgId = useOrgId();

  const { data: revenueBreakdown, isLoading: revenueLoading } = useQuery({
    queryKey: ['financial-revenue-breakdown', startDate, endDate, orgId],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('booking_type, currency, final_amount, created_at')
        .eq('status', 'paid');

      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;
      if (error) throw error;

      const breakdown: Record<string, RevenueBreakdown> = {};
      for (const invoice of data || []) {
        const cur = (invoice.currency || 'EGP') as SupportedCurrency;
        const key = `${invoice.booking_type}|${cur}`;
        if (!breakdown[key]) {
          breakdown[key] = {
            booking_type: invoice.booking_type,
            total_revenue: 0,
            booking_count: 0,
            currency: cur,
          };
        }
        breakdown[key].total_revenue += Number(invoice.final_amount || 0);
        breakdown[key].booking_count += 1;
      }
      return Object.values(breakdown);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: expenseBreakdown, isLoading: expensesLoading } = useQuery({
    queryKey: ['financial-expense-breakdown', startDate, endDate, orgId],
    queryFn: async () => {
      let query = supabase
        .from('expense_transactions')
        .select(`amount, currency, transaction_date, category:expense_categories(name, name_ar)`)
        .eq('status', 'approved');

      if (startDate) query = query.gte('transaction_date', startDate);
      if (endDate) query = query.lte('transaction_date', endDate);

      const { data, error } = await query;
      if (error) throw error;

      const breakdown: Record<string, ExpenseBreakdown> = {};
      for (const expense of data || []) {
        const categoryName = expense.category?.name || 'غير محدد';
        const categoryNameAr = expense.category?.name_ar || 'غير محدد';
        const cur = (expense.currency || 'EGP') as SupportedCurrency;
        const key = `${categoryName}|${cur}`;
        if (!breakdown[key]) {
          breakdown[key] = {
            category_name: categoryName,
            category_name_ar: categoryNameAr,
            total_amount: 0,
            transaction_count: 0,
            currency: cur,
          };
        }
        breakdown[key].total_amount += Number(expense.amount || 0);
        breakdown[key].transaction_count += 1;
      }
      return Object.values(breakdown);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: salariesByCurrency, isLoading: salariesLoading } = useQuery({
    queryKey: ['financial-salaries-by-currency', startDate, endDate, orgId],
    queryFn: async () => {
      let query = supabase
        .from('monthly_salaries')
        .select('net_salary, currency, status, salary_month')
        .eq('status', 'paid');
      if (startDate) query = query.gte('salary_month', startDate);
      if (endDate) query = query.lte('salary_month', endDate);
      const { data, error } = await query;
      if (error) throw error;
      const totals: Record<string, number> = {};
      for (const s of (data as any[]) || []) {
        const cur = (s.currency || 'EGP') as SupportedCurrency;
        totals[cur] = (totals[cur] || 0) + Number(s.net_salary || 0);
      }
      return totals;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: rentByCurrency, isLoading: rentLoading } = useQuery({
    queryKey: ['financial-rent-by-currency', startDate, endDate, orgId],
    queryFn: async () => {
      let query = supabase
        .from('rent_payments')
        .select('amount, currency, status, payment_date')
        .eq('status', 'paid');
      if (startDate) query = query.gte('payment_date', startDate);
      if (endDate) query = query.lte('payment_date', endDate);
      const { data, error } = await query;
      if (error) throw error;
      const totals: Record<string, number> = {};
      for (const p of (data as any[]) || []) {
        const cur = (p.currency || 'EGP') as SupportedCurrency;
        totals[cur] = (totals[cur] || 0) + Number(p.amount || 0);
      }
      return totals;
    },
    staleTime: 1000 * 60 * 5,
  });

  const summaryByCurrency: CurrencySummary[] = (() => {
    const map: Record<string, CurrencySummary> = {};
    const ensure = (cur: SupportedCurrency) => {
      if (!map[cur]) map[cur] = { currency: cur, revenue: 0, expenses: 0, salaries: 0, rent: 0, net_profit: 0 };
      return map[cur];
    };
    (revenueBreakdown || []).forEach((r) => { ensure(r.currency).revenue += r.total_revenue; });
    (expenseBreakdown || []).forEach((e) => { ensure(e.currency).expenses += e.total_amount; });
    Object.entries(salariesByCurrency || {}).forEach(([cur, v]) => { ensure(cur as SupportedCurrency).salaries += v as number; });
    Object.entries(rentByCurrency || {}).forEach(([cur, v]) => { ensure(cur as SupportedCurrency).rent += v as number; });
    return Object.values(map).map((s) => ({ ...s, net_profit: s.revenue - s.expenses - s.salaries - s.rent }));
  })();

  return {
    revenueBreakdown,
    expenseBreakdown,
    salariesByCurrency,
    rentByCurrency,
    summaryByCurrency,
    revenueLoading,
    expensesLoading,
    salariesLoading,
    rentLoading,
    isLoading: revenueLoading || expensesLoading || salariesLoading || rentLoading,
  };
};
