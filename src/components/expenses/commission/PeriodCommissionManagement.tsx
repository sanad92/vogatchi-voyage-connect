
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, DollarSign, Calendar, User, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { usePeriodCommissions } from '@/hooks/usePeriodCommissions';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PeriodCommissionManagement = () => {
  const { 
    commissionPeriods, 
    periodsLoading, 
    periodsError,
    updatePeriodCommissionStatus,
    deletePeriodCommission,
    isUpdatingStatus,
    isDeleting,
    getCommissionPeriodsStatistics
  } = usePeriodCommissions();

  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const handleStatusUpdate = async (periodId: string, status: 'pending' | 'paid' | 'cancelled') => {
    try {
      await updatePeriodCommissionStatus({
        commissionPeriodId: periodId,
        status,
        paymentDate: status === 'paid' ? new Date().toISOString().split('T')[0] : undefined
      });
    } catch (error) {
      console.error('خطأ في تحديث حالة العمولة:', error);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (window.confirm('هل أنت متأكد من حذف فترة العمولة هذه؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await deletePeriodCommission(periodId);
      } catch (error) {
        console.error('خطأ في حذف فترة العمولة:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوعة</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">معلقة</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">ملغية</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('ar-SA');
    const end = new Date(endDate).toLocaleDateString('ar-SA');
    return `${start} - ${end}`;
  };

  const statistics = getCommissionPeriodsStatistics();

  if (periodsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري تحميل بيانات العمولات المجمعة...</span>
      </div>
    );
  }

  if (periodsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          حدث خطأ في تحميل بيانات العمولات المجمعة. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات العمولات المجمعة */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">إجمالي الفترات</p>
                  <p className="text-lg font-bold">{statistics.totalPeriods}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">معلقة الدفع</p>
                  <p className="text-lg font-bold text-yellow-600">
                    <EgyptianPoundDisplay amount={statistics.totalPendingAmount} />
                  </p>
                  <p className="text-xs text-gray-500">({statistics.pendingPeriods} فترة)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">مدفوعة هذا الشهر</p>
                  <p className="text-lg font-bold text-green-600">
                    <EgyptianPoundDisplay amount={statistics.totalPaidThisMonth} />
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
                  <p className="text-sm text-gray-600">متوسط معدل العمولة</p>
                  <p className="text-lg font-bold">{statistics.averageCommissionRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* قائمة فترات العمولات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة العمولات المجمعة</CardTitle>
        </CardHeader>
        <CardContent>
          {!commissionPeriods || commissionPeriods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">لا توجد عمولات مجمعة محسوبة حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commissionPeriods.map((period) => (
                <div key={period.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <h3 className="font-semibold">
                          {period.employee?.full_name || 'غير محدد'}
                        </h3>
                        {getStatusBadge(period.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{formatPeriod(period.period_start, period.period_end)}</span>
                        </div>
                        
                        <div>
                          <span className="font-medium">رقم الموظف:</span> {period.employee?.employee_code || 'غير محدد'}
                        </div>
                        
                        <div>
                          <span className="font-medium">معدل العمولة:</span> {period.commission_rate}%
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="bg-blue-50 p-2 rounded">
                          <span className="text-blue-600 font-medium">عدد الحجوزات</span>
                          <div className="text-lg font-bold text-blue-700">{period.total_bookings_count}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-600">إجمالي المبيعات</span>
                          <div className="font-medium">
                            <EgyptianPoundDisplay amount={period.total_booking_amount} />
                          </div>
                        </div>
                        <div className="bg-red-50 p-2 rounded">
                          <span className="text-red-600">إجمالي التكلفة</span>
                          <div className="font-medium">
                            <EgyptianPoundDisplay amount={period.total_supplier_cost} />
                          </div>
                        </div>
                        <div className="bg-green-50 p-2 rounded">
                          <span className="text-green-600 font-medium">صافي الربح</span>
                          <div className="font-bold text-green-700">
                            <EgyptianPoundDisplay amount={period.total_profit} />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        <EgyptianPoundDisplay amount={period.commission_amount} />
                      </div>
                      <div className="text-xs text-gray-500 mb-3">العمولة المستحقة</div>
                      
                      {period.payment_date && (
                        <div className="text-xs text-gray-500 mb-3">
                          دُفعت في: {new Date(period.payment_date).toLocaleDateString('ar-SA')}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {period.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(period.id, 'paid')}
                            disabled={isUpdatingStatus}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isUpdatingStatus ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                دفع
                              </>
                            )}
                          </Button>
                        )}
                        
                        {period.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(period.id, 'cancelled')}
                            disabled={isUpdatingStatus}
                          >
                            {isUpdatingStatus ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                إلغاء
                              </>
                            )}
                          </Button>
                        )}
                        
                        {(period.status === 'pending' || period.status === 'cancelled') && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePeriod(period.id)}
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
                  
                  {period.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">ملاحظات:</span> {period.notes}
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

export default PeriodCommissionManagement;
