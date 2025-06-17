
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Users, DollarSign, Calendar, InfoIcon, AlertCircle } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { usePeriodCommissions } from '@/hooks/usePeriodCommissions';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const PeriodCommissionCalculation = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const { employees } = useExpenses();
  const { 
    generatePeriodCommission, 
    getEmployeeBookingsProfit,
    isGenerating 
  } = usePeriodCommissions();

  const activeEmployees = employees?.filter(emp => emp.is_active && emp.commission_rate > 0) || [];

  // جلب معاينة الحجوزات للموظف في الفترة المحددة
  const { 
    data: bookingsData, 
    isLoading: bookingsLoading,
    error: bookingsError 
  } = getEmployeeBookingsProfit(
    selectedEmployeeId, 
    periodStart, 
    periodEnd
  );

  const selectedEmployee = employees?.find(emp => emp.id === selectedEmployeeId);

  // حساب معاينة العمولة
  const calculatePreview = () => {
    if (!bookingsData || !selectedEmployee) return null;

    const totalBookingAmount = bookingsData.reduce((sum, booking) => sum + booking.booking_amount, 0);
    const totalSupplierCost = bookingsData.reduce((sum, booking) => sum + booking.supplier_cost, 0);
    const totalProfit = bookingsData.reduce((sum, booking) => sum + booking.profit, 0);
    const commissionAmount = totalProfit * (selectedEmployee.commission_rate / 100);

    return {
      bookingsCount: bookingsData.length,
      totalBookingAmount,
      totalSupplierCost,
      totalProfit,
      commissionRate: selectedEmployee.commission_rate,
      commissionAmount
    };
  };

  const previewCalculation = calculatePreview();

  const handlePreview = () => {
    if (!selectedEmployeeId || !periodStart || !periodEnd) {
      alert('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setPreviewData(previewCalculation);
  };

  const handleGenerate = () => {
    if (!selectedEmployeeId || !periodStart || !periodEnd) {
      alert('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    generatePeriodCommission({
      employeeId: selectedEmployeeId,
      periodStart,
      periodEnd,
      notes
    });

    // إعادة تعيين النموذج
    setSelectedEmployeeId('');
    setPeriodStart('');
    setPeriodEnd('');
    setNotes('');
    setPreviewData(null);
  };

  if (!activeEmployees.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا يوجد موظفين نشطين مؤهلين لحساب العمولة. يرجى التأكد من وجود موظفين نشطين لديهم معدل عمولة محدد.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* نموذج حساب العمولة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            حساب عمولة موظف لفترة محددة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} - {employee.employee_code} ({employee.commission_rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>تاريخ البداية</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ النهاية</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أدخل أي ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handlePreview}
              variant="outline"
              disabled={!selectedEmployeeId || !periodStart || !periodEnd || bookingsLoading}
            >
              <InfoIcon className="h-4 w-4 mr-2" />
              معاينة الحساب
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={!selectedEmployeeId || !periodStart || !periodEnd || isGenerating}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {isGenerating ? 'جاري الحساب...' : 'حساب وحفظ العمولة'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* معاينة البيانات */}
      {selectedEmployeeId && periodStart && periodEnd && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              معاينة حجوزات الموظف في الفترة المحددة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading && (
              <div className="text-center p-4">
                <div>جاري تحميل البيانات...</div>
              </div>
            )}

            {bookingsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  حدث خطأ في تحميل البيانات: {bookingsError.message}
                </AlertDescription>
              </Alert>
            )}

            {bookingsData && !bookingsLoading && (
              <>
                {bookingsData.length === 0 ? (
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                      لا توجد حجوزات للموظف المحدد في الفترة المختارة.
                      يرجى التحقق من البيانات أو اختيار فترة زمنية أخرى.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* ملخص الحسابات */}
                    {previewCalculation && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-sm text-blue-600">عدد الحجوزات</div>
                          <div className="text-2xl font-bold text-blue-700">
                            {previewCalculation.bookingsCount}
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-sm text-green-600">إجمالي الربح</div>
                          <div className="text-2xl font-bold text-green-700">
                            <MultiCurrencyDisplay 
                              amount={previewCalculation.totalProfit} 
                              currency="EGP" 
                              showInEGP={false} 
                            />
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-sm text-purple-600">العمولة المحسوبة ({previewCalculation.commissionRate}%)</div>
                          <div className="text-2xl font-bold text-purple-700">
                            <MultiCurrencyDisplay 
                              amount={previewCalculation.commissionAmount} 
                              currency="EGP" 
                              showInEGP={false} 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* جدول الحجوزات */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>نوع الحجز</TableHead>
                          <TableHead>تاريخ الحجز</TableHead>
                          <TableHead>مبلغ الحجز</TableHead>
                          <TableHead>تكلفة المورد</TableHead>
                          <TableHead>الربح</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookingsData.map((booking, index) => (
                          <TableRow key={`${booking.booking_type}-${booking.booking_id}-${index}`}>
                            <TableCell>
                              <span className="capitalize">
                                {booking.booking_type === 'hotel' ? 'فندق' : 
                                 booking.booking_type === 'flight' ? 'طيران' : 
                                 booking.booking_type === 'car_rental' ? 'تأجير سيارات' : booking.booking_type}
                              </span>
                            </TableCell>
                            <TableCell>
                              {format(new Date(booking.booking_date), 'dd/MM/yyyy', { locale: ar })}
                            </TableCell>
                            <TableCell>
                              <MultiCurrencyDisplay 
                                amount={booking.booking_amount} 
                                currency="EGP" 
                                showInEGP={false} 
                              />
                            </TableCell>
                            <TableCell>
                              <MultiCurrencyDisplay 
                                amount={booking.supplier_cost} 
                                currency="EGP" 
                                showInEGP={false} 
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              <MultiCurrencyDisplay 
                                amount={booking.profit} 
                                currency="EGP" 
                                showInEGP={false} 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeriodCommissionCalculation;
