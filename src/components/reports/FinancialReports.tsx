import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Target } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from "recharts";
import { CURRENCY_SYMBOLS, SupportedCurrency } from "@/types/currency";

interface FinancialData {
  revenue: number;
  profit: number;
  expenses: number;
  profitMargin: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    profit: number;
    expenses: number;
  }>;
  serviceBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

interface FinancialReportsProps {
  data: FinancialData;
  period: string;
  /** عملة العرض. إذا لم تُمرّر تعرض الأرقام مع رمز "؟" تنبيهاً */
  currency?: SupportedCurrency;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const FinancialReports = ({ data, period, currency = 'EGP' }: FinancialReportsProps) => {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatCurrency = (value: number) => {
    return `${Math.round(value).toLocaleString('en-US')} ${symbol}`;
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* المؤشرات المالية الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold">{formatCurrency(data.revenue)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              {getTrendIcon(data.revenue, data.revenue * 0.9)}
              <span className="text-sm text-green-600 ml-1">+12.5%</span>
              <span className="text-sm text-gray-500">عن الشهر السابق</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">صافي الربح</p>
                <p className="text-2xl font-bold">{formatCurrency(data.profit)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                {data.profitMargin.toFixed(1)}% هامش ربح
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المصروفات</p>
                <p className="text-2xl font-bold">{formatCurrency(data.expenses)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <Target className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-500">
                {((data.expenses / data.revenue) * 100).toFixed(1)}% من الإيرادات
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل النمو</p>
                <p className="text-2xl font-bold text-green-600">+18.3%</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-500">مقارنة بالعام السابق</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسم البياني للاتجاهات المالية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            الاتجاهات المالية - {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#2563eb" 
                strokeWidth={3}
                name="الإيرادات"
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#16a34a" 
                strokeWidth={3}
                name="الأرباح"
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="#dc2626" 
                strokeWidth={3}
                name="المصروفات"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* توزيع الإيرادات حسب الخدمة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              توزيع الإيرادات حسب الخدمة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={data.serviceBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.serviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              مقارنة الأرباح الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="profit" fill="#16a34a" name="الأرباح" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialReports;
