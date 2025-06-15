
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SalaryDistributionChartProps {
  salaries: any[];
  employees: any[];
}

const SalaryDistributionChart = ({ salaries, employees }: SalaryDistributionChartProps) => {
  // Group salaries by position
  const positionData = employees.reduce((acc, employee) => {
    const employeeSalaries = salaries.filter(salary => salary.employee_id === employee.id);
    const totalSalary = employeeSalaries.reduce((sum, salary) => 
      sum + (salary.net_salary_egp || salary.net_salary), 0
    );
    
    if (totalSalary > 0) {
      acc.push({
        position: employee.position,
        total: totalSalary,
        count: employeeSalaries.length
      });
    }
    
    return acc;
  }, [] as any[]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={positionData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="total"
        >
          {positionData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any) => [`${Number(value).toLocaleString()} ج.م`, 'إجمالي الرواتب']}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default SalaryDistributionChart;
