
import Navbar from "@/components/Navbar";
import ReportsChart from "@/components/reports/ReportsChart";
import PerformanceMetrics from "@/components/reports/PerformanceMetrics";
import AutomationTasks from "@/components/reports/AutomationTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Filter, Calendar } from "lucide-react";

const Reports = () => {
  // بيانات وهمية للرسوم البيانية
  const salesData = [
    { name: 'يناير', value: 400000 },
    { name: 'فبراير', value: 300000 },
    { name: 'مارس', value: 600000 },
    { name: 'أبريل', value: 800000 },
    { name: 'مايو', value: 500000 },
    { name: 'يونيو', value: 700000 },
  ];

  const customerSourceData = [
    { name: 'واتساب', value: 45 },
    { name: 'الموقع الإلكتروني', value: 25 },
    { name: 'إحالات', value: 20 },
    { name: 'فيسبوك', value: 10 },
  ];

  const bookingTrendData = [
    { name: 'الأسبوع 1', value: 32 },
    { name: 'الأسبوع 2', value: 45 },
    { name: 'الأسبوع 3', value: 38 },
    { name: 'الأسبوع 4', value: 52 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-blue-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* العنوان والفلاتر */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-orange-900">
              التقارير والتحليلات المتقدمة
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select defaultValue="month">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الفترة الزمنية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">هذا الأسبوع</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="quarter">هذا الربع</SelectItem>
                <SelectItem value="year">هذا العام</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              فلاتر متقدمة
            </Button>
            
            <Button>
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </div>

        {/* مؤشرات الأداء */}
        <div className="mb-8">
          <PerformanceMetrics />
        </div>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ReportsChart
            type="bar"
            data={salesData}
            title="المبيعات الشهرية"
            dataKey="value"
            xAxisKey="name"
          />
          
          <ReportsChart
            type="pie"
            data={customerSourceData}
            title="مصادر العملاء"
            dataKey="value"
          />
          
          <ReportsChart
            type="line"
            data={bookingTrendData}
            title="اتجاه الحجوزات الأسبوعية"
            dataKey="value"
            xAxisKey="name"
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ملخص مالي سريع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">إجمالي الإيرادات:</span>
                  <span className="font-bold text-green-600">2,450,000 ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">إجمالي التكاليف:</span>
                  <span className="font-bold text-red-600">1,890,000 ج.م</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-800 font-medium">صافي الربح:</span>
                  <span className="font-bold text-blue-600">560,000 ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">هامش الربح:</span>
                  <span className="font-bold">22.9%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* مهام الأتمتة */}
        <div className="mb-8">
          <AutomationTasks />
        </div>

        {/* تقارير سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تقرير العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>عملاء جدد هذا الشهر:</span>
                  <span className="font-bold">89</span>
                </div>
                <div className="flex justify-between">
                  <span>عملاء نشطين:</span>
                  <span className="font-bold">245</span>
                </div>
                <div className="flex justify-between">
                  <span>معدل العودة:</span>
                  <span className="font-bold">68%</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Calendar className="h-4 w-4 mr-2" />
                  عرض التفاصيل
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تقرير الحجوزات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>حجوزات مؤكدة:</span>
                  <span className="font-bold text-green-600">156</span>
                </div>
                <div className="flex justify-between">
                  <span>حجوزات معلقة:</span>
                  <span className="font-bold text-yellow-600">23</span>
                </div>
                <div className="flex justify-between">
                  <span>حجوزات ملغية:</span>
                  <span className="font-bold text-red-600">8</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Calendar className="h-4 w-4 mr-2" />
                  عرض التفاصيل
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تقرير المدفوعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>مدفوعات مكتملة:</span>
                  <span className="font-bold text-green-600">134</span>
                </div>
                <div className="flex justify-between">
                  <span>مدفوعات معلقة:</span>
                  <span className="font-bold text-yellow-600">45</span>
                </div>
                <div className="flex justify-between">
                  <span>مدفوعات متأخرة:</span>
                  <span className="font-bold text-red-600">12</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Calendar className="h-4 w-4 mr-2" />
                  عرض التفاصيل
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;
