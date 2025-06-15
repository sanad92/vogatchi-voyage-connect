
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Receipt, Users, Home, PieChart } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import FinancialDashboard from './reports/FinancialDashboard';
import type { SupportedCurrency } from '@/types/currency';

const ExpenseOverview = () => {
  const { 
    expenseTransactions, 
    monthlySalaries, 
    expenseCategories,
    transactionsLoading 
  } = useExpenses();
  
  const { convertToPrimaryCurrency } = useExchangeRates();
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [showFinancialDashboard, setShowFinancialDashboard] = useState(false);
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalSalaries: 0,
    totalRent: 0,
    monthlyChange: 0
  });

  // حساب ملخص المصروفات بالجنيه المصري
  const calculateSummary = async () => {
    const currentDate = new Date();
    let startDate: Date;
    
    switch (selectedPeriod) {
      case 'thisMonth':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        break;
      case 'thisYear':
        startDate = new Date(currentDate.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    }

    let totalExpenses = 0;
    let totalSalaries = 0;
    let totalRent = 0;

    // حساب المصروفات العامة
    if (expenseTransactions) {
      for (const transaction of expenseTransactions) {
        const transactionDate = new Date(transaction.transaction_date);
        if (transactionDate >= startDate) {
          if (transaction.currency && transaction.currency !== 'EGP') {
            const amountInEGP = await convertToPrimaryCurrency(transaction.amount, transaction.currency as SupportedCurrency);
            totalExpenses += amountInEGP;
          } else {
            totalExpenses += transaction.amount;
          }
        }
      }
    }

    // حساب الرواتب
    if (monthlySalaries) {
      for (const salary of monthlySalaries) {
        const salaryDate = new Date(salary.salary_month);
        if (salaryDate >= startDate) {
          if (salary.net_salary_egp) {
            totalSalaries += salary.net_salary_egp;
          } else if (salary.currency && salary.currency !== 'EGP') {
            const amountInEGP = await convertToPrimaryCurrency(salary.net_salary, salary.currency as SupportedCurrency);
            totalSalaries += amountInEGP;
          } else {
            totalSalaries += salary.net_salary;
          }
        }
      }
    }

    // ملاحظة: سيتم حساب الإيجارات لاحقاً عندما يتم دمج useRentPayments في useExpenses

    setSummary({
      totalExpenses,
      totalSalaries,
      totalRent,
      monthlyChange: 0 // يمكن حساب التغيير الشهري لاحقاً
    });
  };

  useEffect(() => {
    if (expenseTransactions && monthlySalaries) {
      calculateSummary();
    }
  }, [selectedPeriod, expenseTransactions, monthlySalaries]);

  if (transactionsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'thisMonth': return 'هذا الشهر';
      case 'lastMonth': return 'الشهر الماضي';
      case 'thisYear': return 'هذا العام';
      default: return 'هذا الشهر';
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان والفلاتر */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">نظرة عامة على المصروفات</h2>
          <p className="text-gray-600">جميع المبالغ محسوبة بالجنيه المصري (ج.م)</p>
        </div>
        <div className="flex gap-4 items-center">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">هذا الشهر</SelectItem>
              <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
              <SelectItem value="thisYear">هذا العام</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowFinancialDashboard(true)}>
            <PieChart className="h-4 w-4 mr-2" />
            لوحة المعلومات الشاملة
          </Button>
        </div>
      </div>

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">المصروفات العامة</p>
                <p className="text-2xl font-bold text-red-600">
                  <EgyptianPoundDisplay amount={summary.totalExpenses} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <Receipt className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الرواتب</p>
                <p className="text-2xl font-bold text-blue-600">
                  <EgyptianPoundDisplay amount={summary.totalSalaries} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">مدفوعات الإيجار</p>
                <p className="text-2xl font-bold text-orange-600">
                  <EgyptianPoundDisplay amount={summary.totalRent} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <Home className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الإجمالي والتحليل */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>إجمالي المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-900">
                <EgyptianPoundDisplay 
                  amount={summary.totalExpenses + summary.totalSalaries + summary.totalRent} 
                />
              </p>
              <p className="text-sm text-gray-600 mt-2">{getPeriodLabel()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">الرواتب</span>
                <span className="text-sm text-gray-600">
                  {((summary.totalSalaries / (summary.totalExpenses + summary.totalSalaries + summary.totalRent)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">المصروفات العامة</span>
                <span className="text-sm text-gray-600">
                  {((summary.totalExpenses / (summary.totalExpenses + summary.totalSalaries + summary.totalRent)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">الإيجارات</span>
                <span className="text-sm text-gray-600">
                  {((summary.totalRent / (summary.totalExpenses + summary.totalSalaries + summary.totalRent)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {expenseTransactions?.length || 0}
            </p>
            <p className="text-sm text-gray-600">معاملة مصروفات</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {monthlySalaries?.length || 0}
            </p>
            <p className="text-sm text-gray-600">راتب شهري</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-600">دفعة إيجار</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {expenseCategories?.length || 0}
            </p>
            <p className="text-sm text-gray-600">فئة مصروفات</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseOverview;
