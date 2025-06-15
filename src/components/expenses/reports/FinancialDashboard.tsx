import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, LineChart, PieChart, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

const FinancialDashboard = () => {
  const { 
    expenseTransactions, 
    monthlySalaries, 
    rentPayments,
    expenseCategories,
    commissions
  } = useExpenses();
  
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Prepare data for charts
  const expenses = expenseTransactions || [];
  const salaries = monthlySalaries || [];
  const rentals = rentPayments || [];
  const categories = expenseCategories || [];
  
  // Filter data based on selected period
  const filterByPeriod = (date: string) => {
    const itemDate = new Date(date);
    const currentDate = new Date();
    
    switch (selectedPeriod) {
      case 'thisMonth':
        return itemDate.getMonth() === currentDate.getMonth() && 
               itemDate.getFullYear() === currentDate.getFullYear();
      case 'lastMonth':
        return itemDate.getMonth() === (currentDate.getMonth() - 1 + 12) % 12 && 
               (itemDate.getMonth() === 11 ? 
                 itemDate.getFullYear() === currentDate.getFullYear() - 1 : 
                 itemDate.getFullYear() === currentDate.getFullYear());
      case 'thisYear':
        return itemDate.getFullYear() === currentDate.getFullYear();
      case 'custom':
        return itemDate.getFullYear() === parseInt(selectedYear);
      default:
        return true;
    }
  };
  
  const filteredExpenses = expenses.filter(exp => filterByPeriod(exp.transaction_date));
  const filteredSalaries = salaries.filter(sal => filterByPeriod(sal.salary_month));
  const filteredRentals = rentals.filter(rent => filterByPeriod(rent.payment_month));
  
  return (
    <div className="space-y-6">
      {/* فلاتر التقارير */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">لوحة المعلومات المالية</h2>
        <div className="flex gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisMonth">هذا الشهر</SelectItem>
              <SelectItem value="lastMonth">الشهر الماضي</SelectItem>
              <SelectItem value="thisYear">هذا العام</SelectItem>
              <SelectItem value="custom">سنة محددة</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedPeriod === 'custom' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      
      {/* ملخص المصروفات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              المصروفات العامة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              <MultiCurrencyDisplay 
                amount={filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)} 
                currency="EGP" 
                showInEGP={false} 
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{filteredExpenses.length} معاملة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              الرواتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              <MultiCurrencyDisplay 
                amount={filteredSalaries.reduce((sum, sal) => sum + sal.net_salary, 0)} 
                currency="EGP" 
                showInEGP={false} 
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{filteredSalaries.length} راتب</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              الإجمالي
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              <EgyptianPoundDisplay 
                amount={
                  filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) +
                  filteredSalaries.reduce((sum, sal) => sum + sal.net_salary, 0) +
                  filteredRentals.reduce((sum, rent) => rent.amount_egp || rent.amount, 0)
                } 
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">إجمالي المصروفات</p>
          </CardContent>
        </Card>
      </div>
      
      {/* تبويبات التقارير */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            المصروفات
          </TabsTrigger>
          <TabsTrigger value="salaries" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            الرواتب
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            الفئات
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            الاتجاهات
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">لا توجد بيانات للعرض</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">أعلى 5 مصروفات</h3>
                      <div className="space-y-2">
                        {filteredExpenses
                          .sort((a, b) => b.amount - a.amount)
                          .slice(0, 5)
                          .map((expense, index) => (
                            <div key={expense.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm">{expense.description}</span>
                              <span className="font-medium text-red-600">
                                <EgyptianPoundDisplay amount={expense.amount} />
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">حسب طريقة الدفع</h3>
                      <div className="space-y-2">
                        {Object.entries(
                          filteredExpenses.reduce((acc, expense) => {
                            const method = expense.payment_method;
                            acc[method] = (acc[method] || 0) + expense.amount;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([method, amount]) => (
                          <div key={method} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">
                              {method === 'cash' ? 'نقداً' : 
                               method === 'bank_transfer' ? 'تحويل بنكي' : 
                               method === 'credit_card' ? 'بطاقة ائتمان' : method}
                            </span>
                            <span className="font-medium text-blue-600">
                              <EgyptianPoundDisplay amount={amount} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="salaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تحليل الرواتب</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSalaries.length === 0 ? (
                <p className="text-center text-gray-500 py-8">لا توجد بيانات للعرض</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="text-lg font-medium text-blue-800 mb-2">متوسط الراتب</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        <EgyptianPoundDisplay 
                          amount={filteredSalaries.reduce((sum, sal) => sum + sal.net_salary, 0) / filteredSalaries.length} 
                        />
                      </p>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="text-lg font-medium text-green-800 mb-2">أعلى راتب</h3>
                      <p className="text-2xl font-bold text-green-600">
                        <EgyptianPoundDisplay 
                          amount={Math.max(...filteredSalaries.map(sal => sal.net_salary))} 
                        />
                      </p>
                    </div>
                    
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h3 className="text-lg font-medium text-orange-800 mb-2">أدنى راتب</h3>
                      <p className="text-2xl font-bold text-orange-600">
                        <EgyptianPoundDisplay 
                          amount={Math.min(...filteredSalaries.map(sal => sal.net_salary))} 
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>المصروفات حسب الفئة</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">لا توجد بيانات للعرض</p>
              ) : (
                <div className="space-y-4">
                  {categories.map(category => {
                    const categoryExpenses = filteredExpenses.filter(exp => exp.category_id === category.id);
                    const totalAmount = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                    const percentage = filteredExpenses.length > 0 
                      ? (categoryExpenses.length / filteredExpenses.length) * 100 
                      : 0;
                    
                    return categoryExpenses.length > 0 ? (
                      <div key={category.id} className="flex items-center p-3 rounded-lg" style={{ backgroundColor: `${category.color}20` }}>
                        <div 
                          className="w-4 h-4 rounded-full mr-3" 
                          style={{ backgroundColor: category.color }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium">{category.name_ar}</span>
                            <span className="font-bold">
                              <EgyptianPoundDisplay amount={totalAmount} />
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: category.color
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{categoryExpenses.length} معاملة</span>
                            <span>{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>اتجاهات المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-8">
                سيتم إضافة رسوم بيانية للاتجاهات قريباً
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
