
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Target, 
  Zap,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { Customer } from "@/types/customer";

interface SmartSegmentationProps {
  customers: Customer[];
}

interface SmartSegment {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  color: string;
  criteria: any[];
  customers: Customer[];
  insights: {
    averageValue: number;
    retention: number;
    growth: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

const SmartCustomerSegmentation = ({ customers }: SmartSegmentationProps) => {
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  // خوارزميات التقسيم الذكي
  const smartSegments = useMemo(() => {
    const segments: SmartSegment[] = [
      {
        id: 'champions',
        name: 'Champions',
        nameAr: 'الأبطال',
        description: 'أفضل العملاء - قيمة عالية وولاء عالي',
        color: '#10b981',
        criteria: [],
        customers: customers.filter(c => 
          (c.total_spent || 0) > 50000 && 
          (c.total_bookings || 0) > 5 &&
          getDaysSinceLastBooking(c.last_booking_date) < 90
        ),
        insights: {
          averageValue: 0,
          retention: 95,
          growth: 15,
          riskLevel: 'low'
        }
      },
      {
        id: 'loyal_customers',
        name: 'Loyal Customers',
        nameAr: 'العملاء المخلصون',
        description: 'عملاء مخلصون بقيمة متوسطة',
        color: '#3b82f6',
        criteria: [],
        customers: customers.filter(c => 
          (c.total_spent || 0) > 20000 && 
          (c.total_bookings || 0) > 3 &&
          getDaysSinceLastBooking(c.last_booking_date) < 120
        ),
        insights: {
          averageValue: 0,
          retention: 80,
          growth: 8,
          riskLevel: 'low'
        }
      },
      {
        id: 'potential_loyalists',
        name: 'Potential Loyalists',
        nameAr: 'المحتملون للولاء',
        description: 'عملاء جدد بإمكانية عالية',
        color: '#8b5cf6',
        criteria: [],
        customers: customers.filter(c => 
          (c.total_bookings || 0) >= 2 && 
          (c.total_bookings || 0) <= 4 &&
          getDaysSinceLastBooking(c.last_booking_date) < 60
        ),
        insights: {
          averageValue: 0,
          retention: 65,
          growth: 25,
          riskLevel: 'medium'
        }
      },
      {
        id: 'new_customers',
        name: 'New Customers',
        nameAr: 'العملاء الجدد',
        description: 'عملاء جدد يحتاجون اهتمام',
        color: '#06b6d4',
        criteria: [],
        customers: customers.filter(c => 
          (c.total_bookings || 0) === 1 &&
          getDaysAgo(c.created_at) < 30
        ),
        insights: {
          averageValue: 0,
          retention: 45,
          growth: 35,
          riskLevel: 'medium'
        }
      },
      {
        id: 'at_risk',
        name: 'At Risk',
        nameAr: 'معرضون للفقدان',
        description: 'عملاء معرضون لترك الخدمة',
        color: '#f59e0b',
        criteria: [],
        customers: customers.filter(c => 
          (c.total_bookings || 0) > 1 &&
          getDaysSinceLastBooking(c.last_booking_date) > 180 &&
          getDaysSinceLastBooking(c.last_booking_date) < 365
        ),
        insights: {
          averageValue: 0,
          retention: 30,
          growth: -15,
          riskLevel: 'high'
        }
      },
      {
        id: 'hibernating',
        name: 'Hibernating',
        nameAr: 'الخاملون',
        description: 'عملاء غير نشطين لفترة طويلة',
        color: '#ef4444',
        criteria: [],
        customers: customers.filter(c => 
          getDaysSinceLastBooking(c.last_booking_date) > 365
        ),
        insights: {
          averageValue: 0,
          retention: 10,
          growth: -25,
          riskLevel: 'high'
        }
      }
    ];

    // حساب المتوسطات والإحصائيات
    segments.forEach(segment => {
      if (segment.customers.length > 0) {
        segment.insights.averageValue = segment.customers.reduce((sum, c) => 
          sum + (c.total_spent || 0), 0) / segment.customers.length;
      }
    });

    return segments;
  }, [customers]);

  function getDaysSinceLastBooking(lastBookingDate?: string): number {
    if (!lastBookingDate) return 999;
    return Math.floor((Date.now() - new Date(lastBookingDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  function getDaysAgo(dateString?: string): number {
    if (!dateString) return 999;
    return Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  }

  // تحليلات متقدمة
  const analytics = useMemo(() => {
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    
    return {
      totalCustomers,
      totalRevenue,
      averageCustomerValue: totalCustomers > 0 ? totalRevenue / totalCustomers : 0,
      segmentDistribution: smartSegments.map(seg => ({
        name: seg.nameAr,
        count: seg.customers.length,
        percentage: totalCustomers > 0 ? (seg.customers.length / totalCustomers) * 100 : 0,
        color: seg.color
      }))
    };
  }, [customers, smartSegments]);

  const getRecommendedActions = (segmentId: string) => {
    const actionMap: Record<string, string[]> = {
      champions: ['دعوات VIP', 'برامج الإحالة', 'منتجات حصرية'],
      loyal_customers: ['برامج الولاء', 'عروض خاصة', 'تجارب متقدمة'],
      potential_loyalists: ['عروض التطوير', 'برامج التدريج', 'خدمة مخصصة'],
      new_customers: ['برامج الترحيب', 'التوجيه', 'العروض التمهيدية'],
      at_risk: ['حملات الاستعادة', 'خصومات خاصة', 'استطلاعات الرأي'],
      hibernating: ['حملات إعادة التفعيل', 'عروض العودة', 'التواصل المباشر']
    };
    return actionMap[segmentId] || [];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            التقسيم الذكي للعملاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="segments">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="segments">القطاعات</TabsTrigger>
              <TabsTrigger value="analytics">التحليلات</TabsTrigger>
              <TabsTrigger value="insights">الرؤى</TabsTrigger>
            </TabsList>

            <TabsContent value="segments" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {smartSegments.map(segment => (
                  <Card 
                    key={segment.id}
                    className={`cursor-pointer transition-all ${
                      selectedSegment === segment.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedSegment(
                      selectedSegment === segment.id ? null : segment.id
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: segment.color }}
                          />
                          <CardTitle className="text-lg">{segment.nameAr}</CardTitle>
                        </div>
                        {segment.insights.riskLevel === 'high' && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">{segment.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">عدد العملاء</span>
                          <Badge variant="secondary">{segment.customers.length}</Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm">متوسط القيمة</span>
                          <span className="text-sm font-bold">
                            {Math.round(segment.insights.averageValue).toLocaleString()} ج.م
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm">معدل الاحتفاظ</span>
                          <span className={`text-sm font-bold ${
                            segment.insights.retention > 70 ? 'text-green-600' : 
                            segment.insights.retention > 40 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {segment.insights.retention}%
                          </span>
                        </div>

                        <Progress 
                          value={segment.insights.retention} 
                          className="h-2"
                        />
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-1">
                          {getRecommendedActions(segment.id).slice(0, 2).map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="font-bold text-2xl">{analytics.totalCustomers}</p>
                    <p className="text-sm text-gray-600">إجمالي العملاء</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="font-bold text-2xl">
                      {Math.round(analytics.totalRevenue).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <Target className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                    <p className="font-bold text-2xl">
                      {Math.round(analytics.averageCustomerValue).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">متوسط قيمة العميل</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6 text-center">
                    <PieChart className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                    <p className="font-bold text-2xl">{smartSegments.length}</p>
                    <p className="text-sm text-gray-600">قطاعات ذكية</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>توزيع القطاعات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.segmentDistribution.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: segment.color }}
                          />
                          <span className="font-medium">{segment.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress 
                            value={segment.percentage} 
                            className="w-24 h-2"
                          />
                          <span className="text-sm w-16 text-right">
                            {segment.count} ({Math.round(segment.percentage)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      توصيات فورية
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">عملاء معرضون للفقدان</p>
                          <p className="text-sm text-red-600">
                            {smartSegments.find(s => s.id === 'at_risk')?.customers.length || 0} عميل
                            يحتاج اهتمام فوري
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">فرص نمو</p>
                          <p className="text-sm text-green-600">
                            {smartSegments.find(s => s.id === 'potential_loyalists')?.customers.length || 0} عميل
                            مرشح للتطوير
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      مؤشرات الأداء
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">معدل الاحتفاظ العام</span>
                          <span className="text-sm font-bold">73%</span>
                        </div>
                        <Progress value={73} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">معدل النمو</span>
                          <span className="text-sm font-bold">12%</span>
                        </div>
                        <Progress value={12} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">رضا العملاء</span>
                          <span className="text-sm font-bold">85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartCustomerSegmentation;
