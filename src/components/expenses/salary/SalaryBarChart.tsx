
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlySalary } from '@/types/expenses';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface SalaryBarChartProps {
  salaries: MonthlySalary[];
}

const SalaryBarChart = ({ salaries }: SalaryBarChartProps) => {
  // تجميع الرواتب حسب الشهر
  const chartData = salaries.reduce((acc, salary) => {
    const month = new Date(salary.salary_month).toLocaleDateString('ar', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.total += salary.net_salary_egp || salary.net_salary;
      existing.count += 1;
    } else {
      acc.push({
        month,
        total: salary.net_salary_egp || salary.net_salary,
        count: 1
      });
    }
    
    return acc;
  }, [] as Array<{ month: string; total: number; count: number }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>إجمالي الرواتب الشهرية</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}ك`}
            />
            <Tooltip 
              formatter={(value: number) => [
                <EgyptianPoundDisplay amount={value} />, 
                'إجمالي الرواتب'
              ]}
            />
            <Bar dataKey="total" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SalaryBarChart;
