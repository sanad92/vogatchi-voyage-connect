/**
 * @deprecated استخدم useFinancialReports.ts (المحرك المحاسبي الجديد) كمصدر رسمي.
 * هذا الـ hook يحسب الأرقام من جداول العمليات وقد لا يطابق القيود المحاسبية.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useExchangeRates } from './useExchangeRates';
import { useOrgId } from './useOrgId';
import { SupportedCurrency } from '@/types/currency';

interface ExpenseBreakdown {
  category_name: string;
  category_name_ar: string;
  total_amount: number;
  total_amount_egp: number;
  transaction_count: number;
  currency: SupportedCurrency;
}

interface RevenueBreakdown {
  booking_type: string;
  total_revenue: number;
  total_revenue_egp: number;
  booking_count: number;
  currency: SupportedCurrency;
}

interface FinancialSummary {
  total_revenue_egp: number;
  total_expenses_egp: number;
  total_salaries_egp: number;
  total_rent_payments_egp: number;
  net_profit_egp: number;
  period_start: string;
  period_end: string;
}

export const useFinancialReportsImproved = (startDate?: string, endDate?: string) => {
  const { convertToPrimaryCurrency } = useExchangeRates();
  const orgId = useOrgId();

  // جلب ملخص الإيرادات
  const { data: revenueBreakdown, isLoading: revenueLoading } = useQuery({
    queryKey: ['financial-revenue-breakdown', startDate, endDate, orgId],
    queryFn: async () => {
      console.log('جاري جلب تفاصيل الإيرادات...');
      
      let query = supabase
        .from('invoices')
        .select(`
          booking_type,
          currency,
          final_amount,
          created_at
        `)
        .eq('status', 'paid');

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('خطأ في جلب بيانات الإيرادات:', error);
        throw error;
      }

      // تجميع البيانات حسب نوع الحجز
      const breakdown: { [key: string]: RevenueBreakdown } = {};
      
      for (const invoice of data || []) {
        const key = invoice.booking_type;
        if (!breakdown[key]) {
          breakdown[key] = {
            booking_type: key,
            total_revenue: 0,
            total_revenue_egp: 0,
            booking_count: 0,
            currency: invoice.currency as SupportedCurrency,
          };
        }
        
        breakdown[key].total_revenue += invoice.final_amount || 0;
        breakdown[key].total_revenue_egp += invoice.final_amount || 0;
        breakdown[key].booking_count += 1;
      }

      const result = Object.values(breakdown);
      console.log('تم جلب تفاصيل الإيرادات بنجاح:', result.length);
      return result;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // جلب ملخص المصروفات
  const { data: expenseBreakdown, isLoading: expensesLoading } = useQuery({
    queryKey: ['financial-expense-breakdown', startDate, endDate, orgId],
    queryFn: async () => {
      console.log('جاري جلب تفاصيل المصروفات...');
      
      let query = supabase
        .from('expense_transactions')
        .select(`
          amount,
          currency,
          transaction_date,
          category:expense_categories(
            name,
            name_ar
          )
        `)
        .eq('status', 'approved');

      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('خطأ في جلب بيانات المصروفات:', error);
        throw error;
      }

      // تجميع البيانات حسب الفئة
      const breakdown: { [key: string]: ExpenseBreakdown } = {};
      
      for (const expense of data || []) {
        const categoryName = expense.category?.name || 'غير محدد';
        const categoryNameAr = expense.category?.name_ar || 'غير محدد';
        
        if (!breakdown[categoryName]) {
          breakdown[categoryName] = {
            category_name: categoryName,
            category_name_ar: categoryNameAr,
            total_amount: 0,
            total_amount_egp: 0,
            transaction_count: 0,
            currency: expense.currency as SupportedCurrency,
          };
        }
        
        breakdown[categoryName].total_amount += expense.amount || 0;
        
        // تحويل إلى الجنيه المصري
        if (expense.currency && expense.currency !== 'EGP') {
          try {
            const amountEGP = await convertToPrimaryCurrency(expense.amount || 0, expense.currency as SupportedCurrency);
            breakdown[categoryName].total_amount_egp += amountEGP;
          } catch (error) {
            console.error('خطأ في تحويل العملة:', error);
            breakdown[categoryName].total_amount_egp += expense.amount || 0;
          }
        } else {
          breakdown[categoryName].total_amount_egp += expense.amount || 0;
        }
        
        breakdown[categoryName].transaction_count += 1;
      }

      const result = Object.values(breakdown);
      console.log('تم جلب تفاصيل المصروفات بنجاح:', result.length);
      return result;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // جلب ملخص الرواتب
  const { data: salariesSummary, isLoading: salariesLoading } = useQuery({
    queryKey: ['financial-salaries-summary', startDate, endDate, orgId],
    queryFn: async () => {
      console.log('جاري جلب ملخص الرواتب...');
      
      let query = supabase
        .from('monthly_salaries')
        .select('net_salary_egp, status, salary_month')
        .eq('status', 'paid');

      if (startDate) {
        query = query.gte('salary_month', startDate);
      }
      if (endDate) {
        query = query.lte('salary_month', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('خطأ في جلب بيانات الرواتب:', error);
        throw error;
      }

      const totalSalaries = data?.reduce((sum, salary) => sum + (salary.net_salary_egp || 0), 0) || 0;
      
      console.log('تم جلب ملخص الرواتب بنجاح:', totalSalaries);
      return totalSalaries;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // جلب ملخص مدفوعات الإيجار
  const { data: rentPaymentsSummary, isLoading: rentLoading } = useQuery({
    queryKey: ['financial-rent-summary', startDate, endDate, orgId],
    queryFn: async () => {
      console.log('جاري جلب ملخص مدفوعات الإيجار...');
      
      let query = supabase
        .from('rent_payments')
        .select('amount_egp, amount, currency, status, payment_date')
        .eq('status', 'paid');

      if (startDate) {
        query = query.gte('payment_date', startDate);
      }
      if (endDate) {
        query = query.lte('payment_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('خطأ في جلب بيانات مدفوعات الإيجار:', error);
        throw error;
      }

      let totalRentPayments = 0;
      
      for (const payment of data || []) {
        if (payment.amount_egp) {
          totalRentPayments += payment.amount_egp;
        } else if (payment.currency && payment.currency !== 'EGP') {
          try {
            const amountEGP = await convertToPrimaryCurrency(payment.amount || 0, payment.currency as SupportedCurrency);
            totalRentPayments += amountEGP;
          } catch (error) {
            console.error('خطأ في تحويل العملة:', error);
            totalRentPayments += payment.amount || 0;
          }
        } else {
          totalRentPayments += payment.amount || 0;
        }
      }
      
      console.log('تم جلب ملخص مدفوعات الإيجار بنجاح:', totalRentPayments);
      return totalRentPayments;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // حساب الملخص المالي الإجمالي
  const getFinancialSummary = (): FinancialSummary | null => {
    if (revenueLoading || expensesLoading || salariesLoading || rentLoading) {
      return null;
    }

    const totalRevenueEGP = revenueBreakdown?.reduce((sum, item) => sum + item.total_revenue_egp, 0) || 0;
    const totalExpensesEGP = expenseBreakdown?.reduce((sum, item) => sum + item.total_amount_egp, 0) || 0;
    const totalSalariesEGP = salariesSummary || 0;
    const totalRentPaymentsEGP = rentPaymentsSummary || 0;
    
    const netProfitEGP = totalRevenueEGP - totalExpensesEGP - totalSalariesEGP - totalRentPaymentsEGP;

    return {
      total_revenue_egp: totalRevenueEGP,
      total_expenses_egp: totalExpensesEGP,
      total_salaries_egp: totalSalariesEGP,
      total_rent_payments_egp: totalRentPaymentsEGP,
      net_profit_egp: netProfitEGP,
      period_start: startDate || '',
      period_end: endDate || '',
    };
  };

  return {
    // البيانات
    revenueBreakdown,
    expenseBreakdown,
    salariesSummary,
    rentPaymentsSummary,
    
    // حالات التحميل
    revenueLoading,
    expensesLoading,
    salariesLoading,
    rentLoading,
    isLoading: revenueLoading || expensesLoading || salariesLoading || rentLoading,
    
    // المساعدات
    getFinancialSummary,
  };
};
