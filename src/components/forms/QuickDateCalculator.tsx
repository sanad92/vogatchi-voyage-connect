import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Calculator } from 'lucide-react';
import { calculateNights, validateDateRange } from '@/utils/calculationHelpers';

interface QuickDateCalculatorProps {
  checkInDate: string;
  checkOutDate: string;
  onDatesChange: (checkIn: string, checkOut: string) => void;
  className?: string;
}

const QuickDateCalculator = ({
  checkInDate,
  checkOutDate,
  onDatesChange,
  className = ''
}: QuickDateCalculatorProps) => {
  const [nights, setNights] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);

  // حساب عدد الليالي عند تغيير التواريخ
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const validation = validateDateRange(checkInDate, checkOutDate);
      
      if (validation.isValid) {
        const calculatedNights = calculateNights(checkInDate, checkOutDate);
        setNights(calculatedNights);
        setDateError(null);
      } else {
        setNights(0);
        setDateError(validation.message || null);
      }
    } else {
      setNights(0);
      setDateError(null);
    }
  }, [checkInDate, checkOutDate]);

  // معالج تغيير تاريخ الوصول
  const handleCheckInChange = (date: string) => {
    onDatesChange(date, checkOutDate);
  };

  // معالج تغيير تاريخ المغادرة
  const handleCheckOutChange = (date: string) => {
    onDatesChange(checkInDate, date);
  };

  // حساب تاريخ المغادرة بناءً على عدد الليالي
  const calculateCheckOutFromNights = (nightsCount: number) => {
    if (!checkInDate || nightsCount <= 0) return;
    
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + nightsCount);
    
    const checkOutString = checkOut.toISOString().split('T')[0];
    onDatesChange(checkInDate, checkOutString);
  };

  // تنسيق التاريخ للعرض
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // الحصول على اللون المناسب لعدد الليالي
  const getNightsBadgeColor = () => {
    if (nights === 0) return 'bg-gray-100 text-gray-600';
    if (nights <= 3) return 'bg-blue-100 text-blue-700';
    if (nights <= 7) return 'bg-green-100 text-green-700';
    if (nights <= 14) return 'bg-yellow-100 text-yellow-700';
    return 'bg-purple-100 text-purple-700';
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-blue-600" />
          مواعيد الإقامة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* حقول التواريخ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="check_in_date" className="text-sm font-medium">
              تاريخ الوصول
            </Label>
            <Input
              id="check_in_date"
              type="date"
              value={checkInDate}
              onChange={(e) => handleCheckInChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
            />
            {checkInDate && (
              <p className="text-xs text-gray-500">
                {formatDateForDisplay(checkInDate)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="check_out_date" className="text-sm font-medium">
              تاريخ المغادرة
            </Label>
            <Input
              id="check_out_date"
              type="date"
              value={checkOutDate}
              onChange={(e) => handleCheckOutChange(e.target.value)}
              min={checkInDate || new Date().toISOString().split('T')[0]}
              className="w-full"
            />
            {checkOutDate && (
              <p className="text-xs text-gray-500">
                {formatDateForDisplay(checkOutDate)}
              </p>
            )}
          </div>
        </div>

        {/* عرض عدد الليالي */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">عدد الليالي:</span>
          </div>
          <Badge className={`${getNightsBadgeColor()} font-bold`}>
            {nights} {nights === 1 ? 'ليلة' : nights === 2 ? 'ليلتان' : 'ليالي'}
          </Badge>
        </div>

        {/* عرض خطأ التواريخ */}
        {dateError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{dateError}</p>
          </div>
        )}

        {/* حاسبة سريعة لعدد الليالي */}
        {checkInDate && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">حاسبة سريعة</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 7].map((nightCount) => (
                <button
                  key={nightCount}
                  type="button"
                  onClick={() => calculateCheckOutFromNights(nightCount)}
                  className="px-2 py-1 text-xs bg-white border border-blue-300 rounded hover:bg-blue-100 transition-colors"
                >
                  {nightCount} {nightCount === 1 ? 'ليلة' : nightCount === 2 ? 'ليلتان' : 'ليالي'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* معلومات إضافية */}
        {nights > 0 && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>• المدة المحددة مناسبة لإقامة {nights <= 3 ? 'قصيرة' : nights <= 7 ? 'متوسطة' : 'طويلة'}</p>
            {nights >= 7 && (
              <p>• يمكن تطبيق خصومات الإقامة الطويلة</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickDateCalculator;