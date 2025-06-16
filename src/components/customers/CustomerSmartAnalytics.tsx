
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  Star,
  BarChart3
} from "lucide-react";
import { Customer } from "@/types/customer";

interface CustomerSmartAnalyticsProps {
  customers: Customer[];
}

const CustomerSmartAnalytics = ({ customers }: CustomerSmartAnalyticsProps) => {
  
  const analytics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Customer segments analysis
    const vipCustomers = customers.filter(c => 
      c.segment?.name === 'VIP' || c.total_spent > 50000
    );
    const newCustomers = customers.filter(c => 
      new Date(c.created_at || '') > thirtyDaysAgo
    );
    const activeCustomers = customers.filter(c => 
      c.last_booking_date && new Date(c.last_booking_date) > sixMonthsAgo
    );
    const inactiveCustomers = customers.filter(c => 
      !c.last_booking_date || new Date(c.last_booking_date) < sixMonthsAgo
    );

    // Revenue analysis
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const avgCustomerValue = customers.length > 0 ? totalRevenue / customers.length : 0;
    
    // Top spending customers
    const topSpenders = customers
      .filter(c => c.total_spent > 0)
      .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
      .slice(0, 5);

    // Customer retention analysis
    const customersWithMultipleBookings = customers.filter(c => (c.total_bookings || 0) > 1);
    const retentionRate = customers.length > 0 ? 
      (customersWithMultipleBookings.length / customers.length) * 100 : 0;

    // Growth trends
    const customersLastYear = customers.filter(c => 
      new Date(c.created_at || '') > oneYearAgo
    );
    const growthRate = customers.length > 0 ? 
      (customersLastYear.length / customers.length) * 100 : 0;

    // Risk analysis
    const highRiskCustomers = customers.filter(c => 
      (c.total_bookings || 0) > 0 && 
      (!c.last_booking_date || new Date(c.last_booking_date) < sixMonthsAgo)
    );

    // Communication gaps
    const missingEmailCustomers = customers.filter(c => !c.email);
    const missingPhoneCustomers = customers.filter(c => !c.phone);

    return {
      segments: {
        vip: vipCustomers.length,
        new: newCustomers.length,
        active: activeCustomers.length,
        inactive: inactiveCustomers.length
      },
      revenue: {
        total: totalRevenue,
        average: avgCustomerValue,
        topSpenders
      },
      metrics: {
        retentionRate: Math.round(retentionRate),
        growthRate: Math.round(growthRate)
      },
      risks: {
        highRisk: highRiskCustomers.length,
        missingEmail: missingEmailCustomers.length,
        missingPhone: missingPhoneCustomers.length
      }
    };
  }, [customers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSegmentPercentage = (count: number) => {
    return customers.length > 0 ? Math.round((count / customers.length) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Customer Segments Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            تحليل شرائح العملاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Star className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold">{analytics.segments.vip}</p>
              <p className="text-sm text-gray-600">عملاء VIP</p>
              <Badge variant="secondary" className="mt-1">
                {getSegmentPercentage(analytics.segments.vip)}%
              </Badge>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{analytics.segments.new}</p>
              <p className="text-sm text-gray-600">عملاء جدد</p>
              <Badge variant="secondary" className="mt-1">
                {getSegmentPercentage(analytics.segments.new)}%
              </Badge>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{analytics.segments.active}</p>
              <p className="text-sm text-gray-600">عملاء نشطين</p>
              <Badge variant="secondary" className="mt-1">
                {getSegmentPercentage(analytics.segments.active)}%
              </Badge>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <TrendingDown className="h-8 w-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold">{analytics.segments.inactive}</p>
              <p className="text-sm text-gray-600">غير نشطين</p>
              <Badge variant="secondary" className="mt-1">
                {getSegmentPercentage(analytics.segments.inactive)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              تحليل الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">إجمالي الإيرادات</span>
              <span className="font-bold text-lg">{formatCurrency(analytics.revenue.total)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">متوسط قيمة العميل</span>
              <span className="font-bold">{formatCurrency(analytics.revenue.average)}</span>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">أعلى العملاء إنفاقاً</p>
              <div className="space-y-2">
                {analytics.revenue.topSpenders.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between text-sm">
                    <span>{customer.name}</span>
                    <span className="font-medium">{formatCurrency(customer.total_spent || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              مؤشرات الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">معدل الاحتفاظ</span>
                <span className="font-bold">{analytics.metrics.retentionRate}%</span>
              </div>
              <Progress value={analytics.metrics.retentionRate} className="h-2" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">معدل النمو السنوي</span>
                <span className="font-bold">{analytics.metrics.growthRate}%</span>
              </div>
              <Progress value={analytics.metrics.growthRate} className="h-2" />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">إحصائيات سريعة</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="font-bold">{customers.length}</p>
                  <p className="text-gray-600">إجمالي العملاء</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="font-bold">
                    {customers.reduce((sum, c) => sum + (c.total_bookings || 0), 0)}
                  </p>
                  <p className="text-gray-600">إجمالي الحجوزات</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Analysis & Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            تحليل المخاطر والعناصر المطلوبة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-red-600" />
                <span className="font-medium">عملاء عالي المخاطر</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{analytics.risks.highRisk}</p>
              <p className="text-sm text-red-600">عملاء يحتاجون متابعة عاجلة</p>
            </div>

            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-medium">بيانات ناقصة</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">
                {analytics.risks.missingEmail + analytics.risks.missingPhone}
              </p>
              <p className="text-sm text-orange-600">عملاء يحتاجون تحديث بيانات</p>
            </div>

            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium">فرص نمو</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{analytics.segments.new}</p>
              <p className="text-sm text-blue-600">عملاء جدد للمتابعة</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">توصيات ذكية:</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• متابعة {analytics.risks.highRisk} عميل عالي المخاطر لتجنب فقدانهم</li>
              <li>• تحديث بيانات التواصل لـ {analytics.risks.missingEmail + analytics.risks.missingPhone} عميل</li>
              <li>• تطوير برنامج ولاء للاحتفاظ بالعملاء المميزين</li>
              <li>• إنشاء حملة تسويقية للعملاء غير النشطين</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerSmartAnalytics;
