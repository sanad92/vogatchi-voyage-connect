
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useFlightBookings } from '@/hooks/useFlightBookings';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FinancialDashboard = () => {
  const { expenseTransactions, monthlySalaries, rentPayments } = useExpenses();
  const { flightBookings } = useFlightBookings();
  const { convertToPrimaryCurrency } = useExchangeRates();
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalSalaries: 0,
    totalRentPayments: 0,
    netProfit: 0
  });

  // جلب حجوزات الفنادق
  const { data: hotelBookings } = useQuery({
    queryKey: ['hotel-bookings-financial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // حساب الملخص المالي بالجنيه المصري
  const calculateFinancialSummary = async () => {
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

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalSalaries = 0;
    let totalRentPayments = 0;

    // حساب الإيرادات من حجوزات الفنادق
    if (hotelBookings) {
      for (const booking of hotelBookings) {
        const bookingDate = new Date(booking.created_at);
        if (bookingDate >= startDate) {
          if (booking.total_cost_customer_egp) {
            totalRevenue += booking.total_cost_customer_egp;
          } else if (booking.currency && booking.currency !== 'EGP') {
            const amountInEGP = await convertToPrimaryCurrency(booking.total_cost_customer, booking.currency);
            totalRevenue += amountInEGP;
          } else {
            totalRevenue += booking.total_cost_customer || 0;
          }
        }
      }
    }

    // حساب الإيرادات من حجوزات الطيران
    if (flightBookings) {
      for (const booking of flightBookings) {
        const bookingDate = new Date(booking.created_at);
        if (bookingDate >= startDate) {
          if (booking.total_cost_egp) {
            totalRevenue += booking.total_cost_egp;
          } else if (booking.currency && booking.currency !== 'EGP') {
            const amountInEGP = await convertToPrimaryCurrency(booking.total_cost, booking.currency);
            totalRevenue += amountInEGP;
          } else {
            totalRevenue += booking.total_cost;
          }
        }
      }
    }

    // حساب المصروفات
    if (expenseTransactions) {
      for (const transaction of expenseTransactions) {
        const transactionDate = new Date(transaction.transaction_date);
        if (transactionDate >= startDate && transaction.status === 'paid') {
          if (transaction.currency && transaction.currency !== 'EGP') {
            const amountInEGP = await convertToPrimaryCurrency(transaction.amount, transaction.currency);
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
        if (salaryDate >= startDate && salary.status === 'paid') {
          if (salary.net_salary_egp) {
            totalSalaries += salary.net_salary_egp;
          } else if (salary.currency && salary.currency !== 'EGP') {
            const amountInEGP = await convertToPrimaryCurrency(salary.net_salary, salary.currency);
            totalSalaries += amountInEGP;
          } else {
            totalSalaries += salary.net_salary;
          }
        }
      }
    }

    // حساب مدفوعات الإيجار
    if (rentPayments) {
      for (const payment of rentPayments) {
        const paymentDate = new Date(payment.payment_month);
        if (paymentDate >= startDate && payment.status === 'paid') {
          if (payment.amount_egp) {
            totalRentPayments += payment.amount_egp;
          } else if (payment.currency && payment.currency !== 'EGP') {
            const amountInEGP = await convertToPrimaryCurrency(payment.amount, payment.currency);
            totalRentPayments += amountInEGP;
          } else {
            totalRentPayments += payment.amount;
          }
        }
      }
    }

    const netProfit = totalRevenue - totalExpenses - totalSalaries - totalRentPayments;

    setFinancialSummary({
      totalRevenue,
      totalExpenses,
      totalSalaries,
      totalRentPayments,
      netProfit
    });
  };

  useEffect(() => {
    if (expenseTransactions && monthlySalaries && rentPayments) {
      calculateFinancialSummary();
    }
  }, [selectedPeriod, expenseTransactions, monthlySalaries, rentPayments, hotelBookings, flightBookings]);

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
      {/* فلاتر الفترة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              لوحة المعلومات المالية - جميع المبالغ بالجنيه المصري
            </div>
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
          </CardTitle>
        </CardHeader>
      </Card>

      {/* بطاقات الملخص المالي */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-green-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalRevenue} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalExpenses} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الرواتب</p>
                <p className="text-2xl font-bold text-blue-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalSalaries} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">مدفوعات الإيجار</p>
                <p className="text-2xl font-bold text-orange-600">
                  <EgyptianPoundDisplay amount={financialSummary.totalRentPayments} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">صافي الربح</p>
                <p className={`text-3xl font-bold ${financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <EgyptianPoundDisplay amount={financialSummary.netProfit} />
                </p>
                <p className="text-xs text-gray-500 mt-1">{getPeriodLabel()}</p>
              </div>
              {financialSummary.netProfit >= 0 ? (
                <TrendingUp className="h-10 w-10 text-green-600" />
              ) : (
                <TrendingDown className="h-10 w-10 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تفاصيل إضافية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>نسب المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">الرواتب</span>
                <span className="text-sm text-gray-600">
                  {financialSummary.totalRevenue > 0 
                    ? `${((financialSummary.totalSalaries / financialSummary.totalRevenue) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">المصروفات العامة</span>
                <span className="text-sm text-gray-600">
                  {financialSummary.totalRevenue > 0 
                    ? `${((financialSummary.totalExpenses / financialSummary.totalRevenue) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">الإيجارات</span>
                <span className="text-sm text-gray-600">
                  {financialSummary.totalRevenue > 0 
                    ? `${((financialSummary.totalRentPayments / financialSummary.totalRevenue) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>هامش الربح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className={`text-4xl font-bold ${financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {financialSummary.totalRevenue > 0 
                  ? `${((financialSummary.netProfit / financialSummary.totalRevenue) * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
              <p className="text-sm text-gray-600 mt-2">هامش الربح الصافي</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialDashboard;
