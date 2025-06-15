
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useFlightBookings } from '@/hooks/useFlightBookings';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

const FinancialDashboard = () => {
  const { expenseTransactions, monthlySalaries, rentPayments } = useExpenses();
  const { flightBookings } = useFlightBookings();
  const { convertToPrimaryCurrency } = useExchangeRates();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    monthlyData: [],
    expensesByCategory: [],
    topServices: []
  });

  const calculateDashboardData = async () => {
    // حساب الإيرادات من حجوزات الطيران
    let totalRevenue = 0;
    if (flightBookings) {
      for (const booking of flightBookings) {
        const profit = booking.total_cost - booking.supplier_cost;
        if (booking.currency && booking.currency !== 'EGP') {
          const profitInEGP = await convertToPrimaryCurrency(profit, booking.currency as any);
          totalRevenue += profitInEGP;
        } else {
          totalRevenue += profit;
        }
      }
    }

    // حساب إجمالي المصروفات بالجنيه المصري
    let totalExpenses = 0;
    
    // مصروفات عامة
    if (expenseTransactions) {
      for (const transaction of expenseTransactions) {
        if (transaction.currency && transaction.currency !== 'EGP') {
          const amountInEGP = await convertToPrimaryCurrency(transaction.amount, transaction.currency);
          totalExpenses += amountInEGP;
        } else {
          totalExpenses += transaction.amount;
        }
      }
    }

    // رواتب
    if (monthlySalaries) {
      for (const salary of monthlySalaries) {
        if (salary.net_salary_egp) {
          totalExpenses += salary.net_salary_egp;
        } else if (salary.currency && salary.currency !== 'EGP') {
          const amountInEGP = await convertToPrimaryCurrency(salary.net_salary, salary.currency);
          totalExpenses += amountInEGP;
        } else {
          totalExpenses += salary.net_salary;
        }
      }
    }

    // إيجارات
    if (rentPayments) {
      for (const payment of rentPayments) {
        if (payment.amount_egp) {
          totalExpenses += payment.amount_egp;
        } else if (payment.currency && payment.currency !== 'EGP') {
          const amountInEGP = await convertToPrimaryCurrency(payment.amount, payment.currency);
          totalExpenses += amountInEGP;
        } else {
          totalExpenses += payment.amount;
        }
      }
    }

    setDashboardData({
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      monthlyData: [],
      expensesByCategory: [],
      topServices: []
    });
  };

  useEffect(() => {
    if (expenseTransactions && monthlySalaries && rentPayments && flightBookings) {
      calculateDashboardData();
    }
  }, [selectedPeriod, expenseTransactions, monthlySalaries, rentPayments, flightBookings]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">لوحة المعلومات المالية</h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">آخر 3 شهور</SelectItem>
            <SelectItem value="6months">آخر 6 شهور</SelectItem>
            <SelectItem value="year">هذا العام</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* بطاقات الملخص */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-green-600">
                  <EgyptianPoundDisplay amount={dashboardData.totalRevenue} />
                </p>
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
                  <EgyptianPoundDisplay amount={dashboardData.totalExpenses} />
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">صافي الربح</p>
                <p className={`text-2xl font-bold ${dashboardData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <EgyptianPoundDisplay amount={dashboardData.totalProfit} />
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${dashboardData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>الأداء المالي الشهري</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, '']} />
                <Line type="monotone" dataKey="revenue" stroke="#00C49F" name="الإيرادات" />
                <Line type="monotone" dataKey="expenses" stroke="#FF8042" name="المصروفات" />
                <Line type="monotone" dataKey="profit" stroke="#0088FE" name="الربح" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع المصروفات حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, 'المبلغ']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات إضافية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {flightBookings?.length || 0}
            </p>
            <p className="text-sm text-gray-600">حجوزات طيران</p>
          </CardContent>
        </Card>

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
            <p className="text-2xl font-bold text-gray-900">
              {rentPayments?.length || 0}
            </p>
            <p className="text-sm text-gray-600">دفعة إيجار</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialDashboard;
