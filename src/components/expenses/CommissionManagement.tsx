
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, TrendingUp, Calculator, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CommissionCalculation from './commission/CommissionCalculation';
import CommissionReports from './commission/CommissionReports';
import CommissionPayments from './commission/CommissionPayments';
import EmployeeCommissionSettings from './commission/EmployeeCommissionSettings';
import PeriodCommissionCalculation from './commission/PeriodCommissionCalculation';
import PeriodCommissionManagement from './commission/PeriodCommissionManagement';
import { useEmployeeCommissions } from '@/hooks/useEmployeeCommissions';
import { usePeriodCommissions } from '@/hooks/usePeriodCommissions';
import { useExpenses } from '@/hooks/useExpenses';

const CommissionManagement = () => {
  const [activeTab, setActiveTab] = useState('period-calculation');
  const { 
    commissions, 
    commissionsLoading, 
    commissionPayments, 
    paymentsLoading,
    validateEmployeeCommissions,
    isValidating
  } = useEmployeeCommissions();
  const {
    commissionPeriods,
    periodsLoading,
    getCommissionPeriodsStatistics
  } = usePeriodCommissions();
  const { employees } = useExpenses();

  // حساب الإحصائيات للنظام القديم والجديد
  const oldSystemStats = {
    totalPendingCommissions: commissions?.filter(c => c.payment_status === 'pending').length || 0,
    totalPendingAmount: commissions?.filter(c => c.payment_status === 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0) || 0,
    totalPaidThisMonth: commissionPayments?.filter(p => {
      const paymentDate = new Date(p.payment_date);
      const currentMonth = new Date();
      return paymentDate.getMonth() === currentMonth.getMonth() && 
             paymentDate.getFullYear() === currentMonth.getFullYear();
    }).reduce((sum, p) => sum + p.total_commission_amount, 0) || 0,
  };

  const newSystemStats = getCommissionPeriodsStatistics();
  const activeEmployees = employees?.filter(e => e.is_active && e.commission_rate > 0).length || 0;

  const handleValidateAll = () => {
    if (employees) {
      employees.forEach(employee => {
        if (employee.is_active && employee.commission_rate > 0) {
          validateEmployeeCommissions(employee.id);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* نظرة عامة على حالة النظام */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              إدارة عمولات الموظفين - النظام المحدث
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleValidateAll}
                disabled={isValidating}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isValidating ? 'جاري التحقق...' : 'التحقق من جميع العمولات'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* تحذير حول التحديث */}
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>نظام العمولات المحدث</AlertTitle>
            <AlertDescription>
              تم تطوير نظام جديد لحساب العمولات بناءً على الربح (10% من فرق السعر) ومجمعة حسب الفترة الزمنية.
              النظام القديم لا يزال متاحاً للمراجعة والمقارنة.
            </AlertDescription>
          </Alert>

          {/* إحصائيات سريعة للنظام الجديد */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">النظام الجديد - فترات العمولات</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {newSystemStats?.totalPeriods || 0}
              </div>
              <div className="text-sm text-blue-600">فترة محسوبة</div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-600">معلقة الدفع (جديد)</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">
                {newSystemStats?.totalPendingAmount.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-yellow-600">ج.م</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">مدفوعة هذا الشهر (جديد)</span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {newSystemStats?.totalPaidThisMonth.toFixed(2) || '0.00'}
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

          {/* مقارنة بين النظامين */}
          {oldSystemStats.totalPendingCommissions > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>عمولات النظام القديم</AlertTitle>
              <AlertDescription>
                يوجد {oldSystemStats.totalPendingCommissions} عمولة من النظام القديم في انتظار الدفع 
                بقيمة {oldSystemStats.totalPendingAmount.toFixed(2)} ج.م. 
                يمكنك مراجعتها في تبويب "النظام القديم".
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="period-calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                حساب العمولات الجديد
              </TabsTrigger>
              <TabsTrigger value="period-management" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                إدارة العمولات المجمعة
              </TabsTrigger>
              <TabsTrigger value="old-calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                النظام القديم
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                دفع العمولات
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
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

            <TabsContent value="old-calculation" className="space-y-4">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  هذا هو النظام القديم لحساب العمولات. يُنصح باستخدام النظام الجديد للحسابات المستقبلية.
                </AlertDescription>
              </Alert>
              <CommissionCalculation />
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
