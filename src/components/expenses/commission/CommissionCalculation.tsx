
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calculator, DollarSign, User, Calendar, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEmployeeCommissions } from '@/hooks/useEmployeeCommissions';
import { useExpenses } from '@/hooks/useExpenses';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CommissionCalculation = () => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [bookingAmount, setBookingAmount] = useState('');
  const [customRate, setCustomRate] = useState('');
  const [bookingType, setBookingType] = useState('hotel');
  const [bookingId, setBookingId] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const { 
    commissions, 
    commissionsLoading,
    calculateCommission,
    cancelCommission,
    validateEmployeeCommissions,
    isCalculating,
    isCancelling,
    isValidating
  } = useEmployeeCommissions();
  
  const { employees } = useExpenses();

  const selectedEmployeeData = employees?.find(emp => emp.id === selectedEmployee);
  const employeeCommissions = commissions?.filter(comm => comm.employee_id === selectedEmployee) || [];
  const pendingCommissions = employeeCommissions.filter(comm => comm.payment_status === 'pending');
  const totalPending = pendingCommissions.reduce((sum, comm) => sum + comm.commission_amount, 0);

  const handleCalculateCommission = () => {
    if (!selectedEmployee || !bookingAmount || !bookingId) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(bookingAmount);
    const rate = customRate ? parseFloat(customRate) : undefined;

    if (amount <= 0) {
      toast({
        title: "مبلغ غير صحيح",
        description: "يجب أن يكون مبلغ الحجز أكبر من صفر",
        variant: "destructive",
      });
      return;
    }

    if (rate !== undefined && (rate < 0 || rate > 100)) {
      toast({
        title: "معدل عمولة غير صحيح",
        description: "معدل العمولة يجب أن يكون بين 0 و 100",
        variant: "destructive",
      });
      return;
    }

    calculateCommission({
      employeeId: selectedEmployee,
      bookingAmount: amount,
      bookingId,
      bookingType,
      commissionRate: rate
    });

    // Reset form
    setBookingAmount('');
    setBookingId('');
    setCustomRate('');
  };

  const handleCancelCommission = (commissionId: string) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذه العمولة؟')) {
      cancelCommission({
        commissionId,
        reason: 'تم الإلغاء يدوياً من واجهة إدارة العمولات'
      });
    }
  };

  const handleValidateEmployee = () => {
    if (!selectedEmployee) {
      toast({
        title: "لم يتم اختيار موظف",
        description: "يرجى اختيار موظف للتحقق من عمولاته",
        variant: "destructive",
      });
      return;
    }
    validateEmployeeCommissions(selectedEmployee);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-800' },
      'paid': { label: 'مدفوع', color: 'bg-green-100 text-green-800' },
      'cancelled': { label: 'ملغي', color: 'bg-red-100 text-red-800' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getBookingTypeBadge = (type: string) => {
    const typeMap = {
      'hotel': { label: 'فندق', color: 'bg-blue-100 text-blue-800' },
      'flight': { label: 'طيران', color: 'bg-green-100 text-green-800' },
      'transport': { label: 'نقل', color: 'bg-purple-100 text-purple-800' },
      'car_rental': { label: 'تأجير سيارة', color: 'bg-orange-100 text-orange-800' }
    };
    
    const typeInfo = typeMap[type as keyof typeof typeMap] || { label: type, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge className={typeInfo.color}>
        {typeInfo.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* حساب عمولة جديدة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            حساب عمولة جديدة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">الموظف</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.filter(emp => emp.is_active).map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} ({employee.employee_code}) - {employee.commission_rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookingType">نوع الحجز</Label>
              <Select value={bookingType} onValueChange={setBookingType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الحجز" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">حجز فندق</SelectItem>
                  <SelectItem value="flight">حجز طيران</SelectItem>
                  <SelectItem value="transport">حجز نقل</SelectItem>
                  <SelectItem value="car_rental">تأجير سيارة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookingId">رقم الحجز</Label>
              <Input
                id="bookingId"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="أدخل رقم الحجز"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookingAmount">مبلغ الحجز (ج.م)</Label>
              <Input
                id="bookingAmount"
                type="number"
                value={bookingAmount}
                onChange={(e) => setBookingAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customRate">معدل عمولة مخصص (اختياري)</Label>
              <Input
                id="customRate"
                type="number"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                placeholder={selectedEmployeeData ? `${selectedEmployeeData.commission_rate}%` : "0.00"}
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          </div>

          {selectedEmployeeData && (
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedEmployeeData.full_name}</strong> - معدل العمولة الافتراضي: {selectedEmployeeData.commission_rate}%
                {bookingAmount && (
                  <div className="mt-2">
                    العمولة المحسوبة: <strong>
                      {(parseFloat(bookingAmount) * (parseFloat(customRate) || selectedEmployeeData.commission_rate) / 100).toFixed(2)} ج.م
                    </strong>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleCalculateCommission}
              disabled={isCalculating || !selectedEmployee || !bookingAmount || !bookingId}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {isCalculating ? 'جاري الحساب...' : 'حساب وإضافة العمولة'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* عمولات الموظف المحدد */}
      {selectedEmployee && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                عمولات {selectedEmployeeData?.full_name}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidateEmployee}
                  disabled={isValidating}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {isValidating ? 'جاري التحقق...' : 'التحقق من صحة العمولات'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-blue-600">إجمالي العمولات</div>
                <div className="text-lg font-bold text-blue-700">{employeeCommissions.length}</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <div className="text-sm text-yellow-600">في الانتظار</div>
                <div className="text-lg font-bold text-yellow-700">{pendingCommissions.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-green-600">المبلغ المعلق</div>
                <div className="text-lg font-bold text-green-700">{totalPending.toFixed(2)} ج.م</div>
              </div>
            </div>

            {showDetails && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {commissionsLoading ? (
                  <div className="text-center py-4">جاري تحميل العمولات...</div>
                ) : employeeCommissions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">لا توجد عمولات لهذا الموظف</div>
                ) : (
                  employeeCommissions.map(commission => (
                    <div key={commission.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getBookingTypeBadge(commission.booking_type)}
                          {getStatusBadge(commission.payment_status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-600">
                            {commission.commission_amount.toFixed(2)} ج.م
                          </span>
                          {commission.payment_status === 'pending' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelCommission(commission.id)}
                              disabled={isCancelling}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                        <div>مبلغ الحجز: {commission.booking_amount.toFixed(2)} ج.م</div>
                        <div>معدل العمولة: {commission.commission_rate}%</div>
                        <div>التاريخ: {format(new Date(commission.commission_date), 'dd/MM/yyyy', { locale: ar })}</div>
                        {commission.booking_id && (
                          <div>رقم الحجز: {commission.booking_id}</div>
                        )}
                      </div>
                      {commission.notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          ملاحظات: {commission.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommissionCalculation;
