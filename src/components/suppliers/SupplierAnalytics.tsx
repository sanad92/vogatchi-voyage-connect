
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Users, Star, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CURRENCY_SYMBOLS } from '@/types/currency';

const SupplierAnalytics = () => {
  // استعلام بيانات الموردين
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // استعلام بيانات المدفوعات
  const { data: payments = [] } = useQuery({
    queryKey: ['supplier-payments-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .select(`
          *,
          suppliers(name, type)
        `)
        .eq('status', 'paid')
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // تحليل الموردين حسب النوع
  const suppliersByType = suppliers.reduce((acc, supplier) => {
    const type = supplier.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeData = Object.entries(suppliersByType).map(([type, count]) => ({
    type: type === 'hotel' ? 'فندق' : 
          type === 'airline' ? 'طيران' : 
          type === 'transport' ? 'نقل' : 'جولة',
    count,
    percentage: ((count / suppliers.length) * 100).toFixed(1)
  }));

  // تحليل المدفوعات الشهرية
  const monthlyPayments = payments.reduce((acc, payment) => {
    const month = new Date(payment.payment_date || payment.paid_date).toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'long' 
    });
    acc[month] = (acc[month] || 0) + (payment.amount_in_egp || payment.amount);
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = Object.entries(monthlyPayments)
    .slice(-6) // آخر 6 أشهر
    .map(([month, amount]) => ({
      month,
      amount: Math.round(amount)
    }));

  // تحليل أفضل الموردين
  const supplierPayments = payments.reduce((acc, payment) => {
    const supplierId = payment.supplier_id;
    const supplierName = payment.suppliers?.name || 'غير معروف';
    
    if (!acc[supplierId]) {
      acc[supplierId] = {
        name: supplierName,
        totalAmount: 0,
        transactionCount: 0
      };
    }
    
    acc[supplierId].totalAmount += (payment.amount_in_egp || payment.amount);
    acc[supplierId].transactionCount += 1;
    
    return acc;
  }, {} as Record<string, any>);

  const topSuppliers = Object.values(supplierPayments)
    .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
    .slice(0, 5)
    .map((supplier: any) => ({
      name: supplier.name,
      amount: Math.round(supplier.totalAmount),
      transactions: supplier.transactionCount
    }));

  // ألوان للرسوم البيانية
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // حساب الإحصائيات العامة
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount_in_egp || p.amount), 0);
  const averageRating = suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length || 0;
  const activeSuppliers = suppliers.filter(s => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* إحصائيات عامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي الموردين</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي المدفوعات</p>
                <p className="text-2xl font-bold">{totalPayments.toLocaleString()} {CURRENCY_SYMBOLS.EGP}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">متوسط التقييم</p>
                <p className="text-2xl font-bold">{averageRating.toFixed(1)}/5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">الموردين النشطين</p>
                <p className="text-2xl font-bold">{activeSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* توزيع الموردين حسب النوع */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع الموردين حسب النوع</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* المدفوعات الشهرية */}
        <Card>
          <CardHeader>
            <CardTitle>المدفوعات الشهرية للموردين</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ${CURRENCY_SYMBOLS.EGP}`} />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* أفضل الموردين */}
      <Card>
        <CardHeader>
          <CardTitle>أفضل 5 موردين (حسب إجمالي المدفوعات)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSuppliers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} ${CURRENCY_SYMBOLS.EGP}`} />
              <Legend />
              <Bar dataKey="amount" fill="#10B981" name="إجمالي المدفوعات" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* جدول تفصيلي لأفضل الموردين */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل أفضل الموردين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">اسم المورد</th>
                  <th className="text-right p-2">إجمالي المدفوعات</th>
                  <th className="text-right p-2">عدد المعاملات</th>
                  <th className="text-right p-2">متوسط المعاملة</th>
                </tr>
              </thead>
              <tbody>
                {topSuppliers.map((supplier, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{supplier.name}</td>
                    <td className="p-2">{supplier.amount.toLocaleString()} {CURRENCY_SYMBOLS.EGP}</td>
                    <td className="p-2">{supplier.transactions}</td>
                    <td className="p-2">
                      {Math.round(supplier.amount / supplier.transactions).toLocaleString()} {CURRENCY_SYMBOLS.EGP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierAnalytics;
