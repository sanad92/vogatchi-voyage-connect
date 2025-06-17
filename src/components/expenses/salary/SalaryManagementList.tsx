import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, DollarSign, Calendar, User, Loader2 } from 'lucide-react';
import { useSalariesImproved } from '@/hooks/useSalariesImproved';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SalaryManagementList = () => {
  const { 
    monthlySalaries, 
    salariesLoading, 
    salariesError,
    updateSalaryStatus,
    isUpdating,
    deleteSalary,
    isDeleting,
    getSalaryStatistics
  } = useSalariesImproved();

  const [selectedSalary, setSelectedSalary] = useState<string | null>(null);

  const handleStatusUpdate = async (salaryId: string, status: 'pending' | 'paid' | 'cancelled') => {
    try {
      await updateSalaryStatus({
        salary_id: salaryId,
        status,
        payment_date: status === 'paid' ? new Date().toISOString().split('T')[0] : undefined
      });
    } catch (error) {
      console.error('خطأ في تحديث حالة الراتب:', error);
    }
  };

  const handleDeleteSalary = async (salaryId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الراتب؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await deleteSalary(salaryId);
      } catch (error) {
        console.error('خطأ في حذف الراتب:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوع</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">معلق</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">ملغي</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const statistics = getSalaryStatistics();

  if (salariesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري تحميل بيانات الرواتب...</span>
      </div>
    );
  }

  if (salariesError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          حدث خطأ في تحميل بيانات الرواتب. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات الرواتب */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">إجمالي رواتب هذا الشهر</p>
                  <p className="text-lg font-bold">
                    <EgyptianPoundDisplay amount={statistics.totalSalariesThisMonth} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">المدفوع</p>
                  <p className="text-lg font-bold text-green-600">
                    <EgyptianPoundDisplay amount={statistics.paidSalariesThisMonth} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">المعلق</p>
                  <p className="text-lg font-bold text-yellow-600">
                    <EgyptianPoundDisplay amount={statistics.pendingSalariesThisMonth} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">عدد الرواتب</p>
                  <p className="text-lg font-bold">{statistics.salariesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* قائمة الرواتب */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الرواتب الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          {!monthlySalaries || monthlySalaries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">لا توجد رواتب محسوبة حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthlySalaries.map((salary) => (
                <div key={salary.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <h3 className="font-semibold">
                          {salary.employee?.full_name || 'غير محدد'}
                        </h3>
                        {getStatusBadge(salary.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(salary.salary_month).toLocaleDateString('ar', { 
                              year: 'numeric', 
                              month: 'long' 
                            })}
                          </span>
                        </div>
                        
                        <div>
                          <span className="font-medium">رقم الموظف:</span> {salary.employee?.employee_code || 'غير محدد'}
                        </div>
                        
                        <div>
                          <span className="font-medium">المنصب:</span> {salary.employee?.position || 'غير محدد'}
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">الراتب الأساسي:</span>
                          <div className="font-medium">
                            <EgyptianPoundDisplay amount={salary.base_salary} />
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">البدلات:</span>
                          <div className="font-medium">
                            <EgyptianPoundDisplay amount={salary.allowances} />
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">المكافآت:</span>
                          <div className="font-medium">
                            <EgyptianPoundDisplay amount={salary.bonus} />
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">الساعات الإضافية:</span>
                          <div className="font-medium">{salary.overtime_hours} ساعة</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        <EgyptianPoundDisplay amount={salary.net_salary} />
                      </div>
                      <div className="text-xs text-gray-500">الراتب الصافي</div>
                      
                      <div className="flex gap-2 mt-3">
                        {salary.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(salary.id, 'paid')}
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'دفع'
                            )}
                          </Button>
                        )}
                        
                        {salary.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSalary(salary.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {salary.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">ملاحظات:</span> {salary.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryManagementList;
