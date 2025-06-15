
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Receipt, Home, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';

const ExpenseOverview = () => {
  const { 
    employees, 
    rentContracts, 
    expenseTransactions, 
    monthlySalaries,
    expenseCategories 
  } = useExpenses();

  // حساب إحصائيات سريعة
  const activeEmployees = employees?.filter(emp => emp.is_active).length || 0;
  const activeContracts = rentContracts?.filter(contract => contract.is_active).length || 0;
  const totalMonthlyRent = rentContracts?.reduce((sum, contract) => sum + contract.monthly_rent, 0) || 0;
  const currentMonthExpenses = expenseTransactions?.filter(
    tx => tx.transaction_date.startsWith(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))
  ).reduce((sum, tx) => sum + tx.amount, 0) || 0;

  const thisMonthSalaries = monthlySalaries?.filter(
    salary => salary.salary_month.startsWith(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))
  ).reduce((sum, salary) => sum + salary.net_salary, 0) || 0;

  const stats = [
    {
      title: 'إجمالي الموظفين',
      value: activeEmployees,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'عقود الإيجار النشطة',
      value: activeContracts,
      icon: Home,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'إجمالي الإيجارات الشهرية',
      value: `${totalMonthlyRent.toLocaleString()} ر.س`,
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'مصروفات الشهر الحالي',
      value: `${currentMonthExpenses.toLocaleString()} ر.س`,
      icon: Receipt,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'رواتب الشهر الحالي',
      value: `${thisMonthSalaries.toLocaleString()} ر.س`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'فئات المصروفات',
      value: expenseCategories?.length || 0,
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* فئات المصروفات */}
      <Card>
        <CardHeader>
          <CardTitle>فئات المصروفات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {expenseCategories?.map((category) => (
              <div key={category.id} className="text-center">
                <Badge 
                  variant="outline" 
                  className="w-full justify-center py-2"
                  style={{ 
                    borderColor: category.color,
                    color: category.color 
                  }}
                >
                  {category.name_ar}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  حد الميزانية: {category.budget_limit.toLocaleString()} ر.س
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* آخر المعاملات */}
      <Card>
        <CardHeader>
          <CardTitle>آخر المعاملات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenseTransactions?.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: transaction.category?.color || '#gray' }}
                  />
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.category?.name_ar} • {new Date(transaction.transaction_date).toLocaleDateString('ar')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{transaction.amount.toLocaleString()} {transaction.currency}</p>
                  <Badge 
                    variant={transaction.status === 'paid' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {transaction.status === 'paid' ? 'مدفوع' : 
                     transaction.status === 'pending' ? 'معلق' : 
                     transaction.status === 'approved' ? 'معتمد' : 'مرفوض'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseOverview;
