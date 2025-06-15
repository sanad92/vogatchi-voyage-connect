
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlySalary } from '@/types/expenses';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface SalaryDistributionChartProps {
  salaries: MonthlySalary[];
}

const SalaryDistributionChart = ({ salaries }: SalaryDistributionChartProps) => {
  // تجميع الرواتب حسب الأقسام أو المستويات
  const chartData = salaries.reduce((acc, salary) => {
    const range = getSalaryRange(salary.net_salary_egp || salary.net_salary);
    const existing = acc.find(item => item.name === range);
    
    if (existing) {
      existing.value += 1;
      existing.total += salary.net_salary_egp || salary.net_salary;
    } else {
      acc.push({
        name: range,
        value: 1,
        total: salary.net_salary_egp || salary.net_salary
      });
    }
    
    return acc;
  }, [] as Array<{ name: string; value: number; total: number }>);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>توزيع الرواتب</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value} موظف`, 
                name
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

function getSalaryRange(salary: number): string {
  if (salary < 5000) return 'أقل من 5,000 ج.م';
  if (salary < 10000) return '5,000 - 10,000 ج.م';
  if (salary < 20000) return '10,000 - 20,000 ج.م';
  if (salary < 30000) return '20,000 - 30,000 ج.م';
  return 'أكثر من 30,000 ج.م';
}

export default SalaryDistributionChart;
