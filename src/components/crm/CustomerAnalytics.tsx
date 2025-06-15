
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, Award, Target, UserCheck } from 'lucide-react';
import { useCRM } from '@/hooks/useCRM';
import { useCustomers } from '@/hooks/useCustomers';

interface CustomerAnalyticsProps {
  timeframe?: '7d' | '30d' | '90d' | '1y';
}

const CustomerAnalytics = ({ timeframe = '30d' }: CustomerAnalyticsProps) => {
  const { customers } = useCustomers();
  const { customerSegments } = useCRM();

  // حساب تحليلات العملاء
  const analytics = {
    totalCustomers: customers?.length || 0,
    newCustomers: customers?.filter(c => {
      const createdAt = new Date(c.created_at);
      const daysAgo = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
      return createdAt > new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    }).length || 0,
    activeCustomers: customers?.filter(c => 
      c.last_booking_date && new Date(c.last_booking_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length || 0,
    totalRevenue: customers?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0,
    averageOrderValue: customers?.length > 0 ? 
      (customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / customers.length) : 0,
    retentionRate: 75.5, // سيتم حسابها لاحقاً من البيانات الفعلية
    customerLifetimeValue: 18500, // سيتم حسابها لاحقاً من البيانات الفعلية
    churnRate: 12.3 // سيتم حسابها لاحقاً من البيانات الفعلية
  };

  // تحليل توزيع العملاء حسب القطاعات
  const segmentAnalysis = customerSegments?.map(segment => {
    const segmentCustomers = customers?.filter(c => c.segment_id === segment.id) || [];
    return {
      ...segment,
      customerCount: segmentCustomers.length,
      totalRevenue: segmentCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
      avgOrderValue: segmentCustomers.length > 0 ? 
        segmentCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / segmentCustomers.length : 0
    };
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* مؤشرات الأداء الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي العملاء</p>
                <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs">+{analytics.newCustomers} جديد</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs">+15.2%</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">متوسط قيمة الطلب</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.averageOrderValue)}</p>
                <div className="flex items-center gap-1 text-blue-600">
                  <Target className="h-3 w-3" />
                  <span className="text-xs">هدف: 25,000</span>
                </div>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">معدل الاحتفاظ</p>
                <p className="text-2xl font-bold">{analytics.retentionRate}%</p>
                <Progress value={analytics.retentionRate} className="mt-2 h-2" />
              </div>
              <UserCheck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تحليل متقدم */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* قيمة العميل مدى الحياة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              قيمة العميل مدى الحياة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(analytics.customerLifetimeValue)}
                </div>
                <p className="text-sm text-gray-600">متوسط قيمة العميل مدى الحياة</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>العملاء الجدد (أقل من 30 يوم)</span>
                  <span className="font-medium">{formatCurrency(8500)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>العملاء المتكررون (30-180 يوم)</span>
                  <span className="font-medium">{formatCurrency(15200)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>العملاء الأوفياء (+180 يوم)</span>
                  <span className="font-medium">{formatCurrency(32500)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* معدل التراجع */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              تحليل التراجع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {analytics.churnRate}%
                </div>
                <p className="text-sm text-gray-600">معدل التراجع الشهري</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">عملاء معرضون للمغادرة</span>
                  <Badge variant="destructive">23 عميل</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">عملاء خاملون (90+ يوم)</span>
                  <Badge variant="outline">47 عميل</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">عملاء يحتاجون متابعة</span>
                  <Badge variant="secondary">156 عميل</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تحليل القطاعات */}
      <Card>
        <CardHeader>
          <CardTitle>تحليل القطاعات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {segmentAnalysis.map((segment) => (
              <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <div>
                    <h4 className="font-medium">{segment.name_ar}</h4>
                    <p className="text-sm text-gray-600">{segment.customerCount} عميل</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(segment.totalRevenue)}</div>
                  <div className="text-sm text-gray-600">
                    متوسط: {formatCurrency(segment.avgOrderValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerAnalytics;
