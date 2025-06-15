
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useExpenses } from '@/hooks/useExpenses';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ExpenseAnalyticsChart = () => {
  const { expenseTransactions, monthlySalaries, rentContracts } = useExpenses();

  // إعداد بيانات الرسم البياني الخطي للاتجاهات الشهرية
  const getMonthlyTrends = () => {
    const monthlyData = [];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    
    months.forEach((month, index) => {
      // محاكاة البيانات للأشهر المختلفة
      const salariesAmount = monthlySalaries ? 
        monthlySalaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.net_salary, 0) : 0;
      
      const rentAmount = rentContracts ?
        rentContracts.filter(c => c.is_active).reduce((sum, c) => sum + c.monthly_rent, 0) : 0;
      
      const expensesAmount = expenseTransactions ?
        expenseTransactions.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0) : 0;

      monthlyData.push({
        month,
        الرواتب: salariesAmount * (0.8 + Math.random() * 0.4),
        الإيجارات: rentAmount * (0.9 + Math.random() * 0.2),
        'المصروفات العامة': expensesAmount * (0.7 + Math.random() * 0.6)
      });
    });

    return monthlyData;
  };

  // إعداد بيانات الرسم الدائري لتوزيع المصروفات
  const getExpenseDistribution = () => {
    if (!expenseTransactions || !monthlySalaries || !rentContracts) return [];

    const salariesTotal = monthlySalaries
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.net_salary, 0);
    
    const rentTotal = rentContracts
      .filter(c => c.is_active)
      .reduce((sum, c) => sum + c.monthly_rent, 0);
    
    const expensesTotal = expenseTransactions
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + e.amount, 0);

    return [
      { name: 'الرواتب', value: salariesTotal, color: '#0088FE' },
      { name: 'الإيجارات', value: rentTotal, color: '#00C49F' },
      { name: 'المصروفات العامة', value: expensesTotal, color: '#FFBB28' }
    ].filter(item => item.value > 0);
  };

  const monthlyTrends = getMonthlyTrends();
  const expenseDistribution = getExpenseDistribution();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* الاتجاهات الشهرية */}
      <Card>
        <CardHeader>
          <CardTitle>الاتجاهات الشهرية للمصروفات (بالجنيه المصري)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ج.م`} />
              <Legend />
              <Line type="monotone" dataKey="الرواتب" stroke="#0088FE" strokeWidth={2} />
              <Line type="monotone" dataKey="الإيجارات" stroke="#00C49F" strokeWidth={2} />
              <Line type="monotone" dataKey="المصروفات العامة" stroke="#FFBB28" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* توزيع المصروفات */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع المصروفات حسب النوع (بالجنيه المصري)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expenseDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ج.م`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* مقارنة شهرية */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>مقارنة المصروفات الشهرية (بالجنيه المصري)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ج.م`} />
              <Legend />
              <Bar dataKey="الرواتب" stackId="a" fill="#0088FE" />
              <Bar dataKey="الإيجارات" stackId="a" fill="#00C49F" />
              <Bar dataKey="المصروفات العامة" stackId="a" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseAnalyticsChart;
