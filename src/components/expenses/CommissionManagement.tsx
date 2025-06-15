
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, TrendingUp, Calculator, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CommissionCalculation from './commission/CommissionCalculation';
import CommissionReports from './commission/CommissionReports';
import CommissionPayments from './commission/CommissionPayments';
import EmployeeCommissionSettings from './commission/EmployeeCommissionSettings';
import { useEmployeeCommissions } from '@/hooks/useEmployeeCommissions';
import { useExpenses } from '@/hooks/useExpenses';

const CommissionManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    commissions, 
    commissionsLoading, 
    commissionPayments, 
    paymentsLoading,
    validateEmployeeCommissions,
    isValidating
  } = useEmployeeCommissions();
  const { employees } = useExpenses();

  // حساب الإحصائيات
  const stats = {
    totalPendingCommissions: commissions?.filter(c => c.payment_status === 'pending').length || 0,
    totalPendingAmount: commissions?.filter(c => c.payment_status === 'pending')
      .reduce((sum, c) => sum + c.commission_amount, 0) || 0,
    totalPaidThisMonth: commissionPayments?.filter(p => {
      const paymentDate = new Date(p.payment_date);
      const currentMonth = new Date();
      return paymentDate.getMonth() === currentMonth.getMonth() && 
             paymentDate.getFullYear() === currentMonth.getFullYear();
    }).reduce((sum, p) => sum + p.total_commission_amount, 0) || 0,
    activeEmployees: employees?.filter(e => e.is_active && e.commission_rate > 0).length || 0
  };

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
              إدارة عمولات الموظفين
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
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">عمولات في الانتظار</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{stats.totalPendingCommissions}</div>
              <div className="text-sm text-blue-600">{stats.totalPendingAmount.toFixed(2)} ج.م</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">مدفوع هذا الشهر</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{stats.totalPaidThisMonth.toFixed(2)}</div>
              <div className="text-sm text-green-600">ج.م</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">موظفين نشطين</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{stats.activeEmployees}</div>
              <div className="text-sm text-purple-600">مؤهل للعمولة</div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">معدل العمولة المتوسط</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">
                {employees && employees.length > 0 
                  ? (employees.filter(e => e.commission_rate > 0)
                      .reduce((sum, e) => sum + (e.commission_rate || 0), 0) / 
                     employees.filter(e => e.commission_rate > 0).length).toFixed(1)
                  : '0'
                }%
              </div>
              <div className="text-sm text-orange-600">متوسط</div>
            </div>
          </div>

          {/* تحذيرات النظام */}
          {stats.totalPendingCommissions > 10 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>تنبيه: عدد كبير من العمولات المعلقة</AlertTitle>
              <AlertDescription>
                يوجد {stats.totalPendingCommissions} عمولة في انتظار الدفع بقيمة إجمالية {stats.totalPendingAmount.toFixed(2)} ج.م. 
                يُنصح بمراجعة ومعالجة هذه العمولات.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                حساب العمولات
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

            <TabsContent value="calculation" className="space-y-4">
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
