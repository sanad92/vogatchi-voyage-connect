
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, Calendar, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CommissionReports from './commission/CommissionReports';
import CommissionPayments from './commission/CommissionPayments';
import EmployeeCommissionSettings from './commission/EmployeeCommissionSettings';
import PeriodCommissionCalculation from './commission/PeriodCommissionCalculation';
import PeriodCommissionManagement from './commission/PeriodCommissionManagement';
import { usePeriodCommissions } from '@/hooks/usePeriodCommissions';
import { useExpenses } from '@/hooks/useExpenses';

const CommissionManagement = () => {
  const [activeTab, setActiveTab] = useState('period-calculation');
  
  const {
    commissionPeriods,
    getCommissionPeriodsStatistics
  } = usePeriodCommissions();
  
  const { employees } = useExpenses();

  // حساب الإحصائيات للنظام الجديد
  const systemStats = getCommissionPeriodsStatistics();
  const activeEmployees = employees?.filter(e => e.is_active && e.commission_rate > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* نظرة عامة على حالة النظام */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              إدارة عمولات الموظفين - النظام المحسّن
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* معلومات النظام المحسّن */}
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>نظام العمولات المحسّن</AlertTitle>
            <AlertDescription>
              نظام حساب العمولات بناءً على الربح (10% من فرق السعر) ومجمعة حسب الفترة الزمنية.
              تم ربط جميع الحجوزات الموجودة بالموظفين المسؤولين عنها.
            </AlertDescription>
          </Alert>

          {/* إحصائيات سريعة للنظام */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">فترات العمولات</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {systemStats?.totalPeriods || 0}
              </div>
              <div className="text-sm text-blue-600">فترة محسوبة</div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-600">معلقة الدفع</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">
                {systemStats?.totalPendingAmount.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-yellow-600">ج.م</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">مدفوعة هذا الشهر</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {systemStats?.totalPaidThisMonth.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-green-600">ج.م</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">موظفين نشطين</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{activeEmployees}</div>
              <div className="text-sm text-purple-600">مؤهل للعمولة</div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="period-calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                حساب العمولات
              </TabsTrigger>
              <TabsTrigger value="period-management" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                إدارة العمولات
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                دفع العمولات
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                التقارير
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                إعدادات الموظفين
              </TabsTrigger>
            </TabsList>

            <TabsContent value="period-calculation" className="space-y-4">
              <PeriodCommissionCalculation />
            </TabsContent>

            <TabsContent value="period-management" className="space-y-4">
              <PeriodCommissionManagement />
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <CommissionPayments />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <CommissionReports />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <EmployeeCommissionSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionManagement;
