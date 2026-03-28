
import { useMemo } from 'react';
import { useExpenseTransactionsOptimized as useExpenseTransactions } from './useExpenseTransactionsOptimized';
import { useSalaries } from './useSalaries';
import { useRentContracts } from './useRentContracts';
import { useRentPayments } from './useRentPayments';
import { useEmployeeCommissions } from './useEmployeeCommissions';

export interface FinancialSummary {
  totalExpenses: number;
  totalSalaries: number;
  totalRentPayments: number;
  totalCommissions: number;
  totalOperationalCosts: number;
  netCashFlow: number;
  monthlyBreakdown: {
    month: string;
    expenses: number;
    salaries: number;
    rent: number;
    commissions: number;
    total: number;
  }[];
}

export const useFinancialCalculations = (year?: number) => {
  const currentYear = year || new Date().getFullYear();
  
  const { transactions: expenseTransactions } = useExpenseTransactions();
  const { monthlySalaries } = useSalaries();
  const { rentContracts } = useRentContracts();
  const { rentPayments } = useRentPayments();
  const { commissionPayments } = useEmployeeCommissions();

  // حساب الملخص المالي الشامل
  const financialSummary = useMemo((): FinancialSummary => {
    // فلترة البيانات للسنة المحددة
    const yearlyExpenses = expenseTransactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getFullYear() === currentYear && t.status === 'approved';
    });

    const yearlySalaries = monthlySalaries.filter(s => {
      const salaryYear = parseInt(s.salary_month.split('-')[0]);
      return salaryYear === currentYear && s.status === 'paid';
    });

    const yearlyRentPayments = rentPayments.filter(p => {
      const paymentYear = new Date(p.payment_month + '-01').getFullYear();
      return paymentYear === currentYear && p.status === 'paid';
    });

    const yearlyCommissions = commissionPayments.filter(c => {
      const commissionYear = new Date(c.payment_date).getFullYear();
      return commissionYear === currentYear;
    });

    // حساب الإجماليات
    const totalExpenses = yearlyExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalSalaries = yearlySalaries.reduce((sum, s) => sum + Number(s.net_salary), 0);
    const totalRentPayments = yearlyRentPayments.reduce((sum, p) => sum + Number(p.amount_egp || p.amount), 0);
    const totalCommissions = yearlyCommissions.reduce((sum, c) => sum + Number(c.total_commission_amount), 0);
    
    const totalOperationalCosts = totalExpenses + totalSalaries + totalRentPayments + totalCommissions;

    // حساب التحليل الشهري
    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthStr = `${currentYear}-${month.toString().padStart(2, '0')}`;
      
      const monthlyExpenses = yearlyExpenses
        .filter(t => t.transaction_date.startsWith(monthStr))
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const monthlySalaryTotal = yearlySalaries
        .filter(s => s.salary_month.startsWith(monthStr))
        .reduce((sum, s) => sum + Number(s.net_salary), 0);
      
      const monthlyRent = yearlyRentPayments
        .filter(p => p.payment_month === monthStr)
        .reduce((sum, p) => sum + Number(p.amount_egp || p.amount), 0);
      
      const monthlyCommissionTotal = yearlyCommissions
        .filter(c => {
          const commissionMonth = new Date(c.payment_date).getMonth() + 1;
          return commissionMonth === month;
        })
        .reduce((sum, c) => sum + Number(c.total_commission_amount), 0);

      return {
        month: new Date(currentYear, i, 1).toLocaleDateString('ar-EG', { month: 'long' }),
        expenses: monthlyExpenses,
        salaries: monthlySalaryTotal,
        rent: monthlyRent,
        commissions: monthlyCommissionTotal,
        total: monthlyExpenses + monthlySalaryTotal + monthlyRent + monthlyCommissionTotal
      };
    });

    return {
      totalExpenses,
      totalSalaries,
      totalRentPayments,
      totalCommissions,
      totalOperationalCosts,
      netCashFlow: -totalOperationalCosts, // سالب لأنها تكاليف
      monthlyBreakdown
    };
  }, [expenseTransactions, monthlySalaries, rentPayments, commissionPayments, currentYear]);

  // حساب الإحصائيات الشهرية للشهر الحالي
  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

    const thisMonthExpenses = expenseTransactions
      .filter(t => t.transaction_date.startsWith(monthStr) && t.status === 'approved')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const thisMonthSalaries = monthlySalaries
      .filter(s => s.salary_month.startsWith(monthStr) && s.status === 'paid')
      .reduce((sum, s) => sum + Number(s.net_salary), 0);

    const thisMonthRent = rentPayments
      .filter(p => p.payment_month === monthStr && p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount_egp || p.amount), 0);

    const thisMonthCommissions = commissionPayments
      .filter(c => {
        const commissionDate = new Date(c.payment_date);
        return commissionDate.getMonth() + 1 === currentMonth && 
               commissionDate.getFullYear() === currentYear;
      })
      .reduce((sum, c) => sum + Number(c.total_commission_amount), 0);

    return {
      expenses: thisMonthExpenses,
      salaries: thisMonthSalaries,
      rent: thisMonthRent,
      commissions: thisMonthCommissions,
      total: thisMonthExpenses + thisMonthSalaries + thisMonthRent + thisMonthCommissions
    };
  }, [expenseTransactions, monthlySalaries, rentPayments, commissionPayments]);

  // حساب النسب والمؤشرات
  const ratios = useMemo(() => {
    const { totalOperationalCosts, totalExpenses, totalSalaries, totalRentPayments, totalCommissions } = financialSummary;
    
    if (totalOperationalCosts === 0) {
      return {
        expenseRatio: 0,
        salaryRatio: 0,
        rentRatio: 0,
        commissionRatio: 0
      };
    }

    return {
      expenseRatio: (totalExpenses / totalOperationalCosts) * 100,
      salaryRatio: (totalSalaries / totalOperationalCosts) * 100,
      rentRatio: (totalRentPayments / totalOperationalCosts) * 100,
      commissionRatio: (totalCommissions / totalOperationalCosts) * 100
    };
  }, [financialSummary]);

  return {
    financialSummary,
    currentMonthStats,
    ratios,
    isLoading: false // يمكن إضافة loading states من الـ hooks الفرعية
  };
};
