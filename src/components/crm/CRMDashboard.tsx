
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, PieChart, TrendingUp, Users, Target, Brain } from 'lucide-react';
import CustomerAnalytics from './CustomerAnalytics';
import SmartSegmentation from './SmartSegmentation';
import { useCRM } from '@/hooks/useCRM';

const CRMDashboard = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { customerSegments, loyaltyRewards, marketingCampaigns } = useCRM();

  const timeframeOptions = [
    { value: '7d', label: 'آخر 7 أيام' },
    { value: '30d', label: 'آخر 30 يوم' },
    { value: '90d', label: 'آخر 90 يوم' },
    { value: '1y', label: 'آخر سنة' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            لوحة تحكم CRM المتقدمة
          </h1>
          <p className="text-gray-600 mt-2">تحليلات ذكية وإدارة متقدمة لعلاقات العملاء</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeframeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* نظرة عامة سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">قطاعات العملاء</p>
                <p className="text-2xl font-bold">{customerSegments?.length || 0}</p>
                <p className="text-xs text-green-600">+2 هذا الشهر</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">مكافآت الولاء</p>
                <p className="text-2xl font-bold">{loyaltyRewards?.length || 0}</p>
                <p className="text-xs text-blue-600">نشطة</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الحملات النشطة</p>
                <p className="text-2xl font-bold">
                  {marketingCampaigns?.filter(c => c.status === 'active').length || 0}
                </p>
                <p className="text-xs text-purple-600">قيد التشغيل</p>
              </div>
              <PieChart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التابات الرئيسية */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">التحليلات</span>
          </TabsTrigger>
          <TabsTrigger value="segmentation" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">التجزئة</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">الحملات</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">الرؤى الذكية</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <CustomerAnalytics timeframe={timeframe} />
        </TabsContent>

        <TabsContent value="segmentation">
          <SmartSegmentation />
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>إدارة الحملات التسويقية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">الحملات التسويقية</h3>
                <p className="text-gray-600 mb-4">
                  سيتم إضافة إدارة الحملات التسويقية في المرحلة التالية
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                الرؤى الذكية والتوصيات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">💡 توصية ذكية</h4>
                  <p className="text-blue-700 text-sm">
                    لديك 23 عميل معرض للمغادرة. نوصي بإرسال حملة استعادة بخصم 15% خلال الأسبوع القادم.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">📈 فرصة نمو</h4>
                  <p className="text-green-700 text-sm">
                    العملاء الجدد يظهرون نمط حجز مرتفع. زيادة الاستثمار في التسويق الرقمي قد تحقق عائد 300%.
                  </p>
                </div>
                
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">⚠️ تحذير</h4>
                  <p className="text-orange-700 text-sm">
                    معدل التراجع ارتفع بنسبة 15% هذا الشهر. يُنصح بمراجعة استراتيجية الاحتفاظ بالعملاء.
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">🎯 هدف مقترح</h4>
                  <p className="text-purple-700 text-sm">
                    زيادة متوسط قيمة الطلب إلى 25,000 ج.م خلال الربع القادم من خلال عروض الباقات المجمعة.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMDashboard;
