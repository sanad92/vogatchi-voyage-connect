
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { HotelBooking } from "@/types/hotelBooking";

interface HotelSupplierPaymentGeneratorProps {
  booking: HotelBooking;
  onClose: () => void;
}

const escapeHtml = (unsafe: string | null | undefined): string => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const HotelSupplierPaymentGenerator = ({ booking, onClose }: HotelSupplierPaymentGeneratorProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>أمر دفع - ${escapeHtml(booking.supplier_name)}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
                .payment-title { font-size: 24px; font-weight: bold; margin: 20px 0; background: #dc2626; color: white; padding: 10px; text-align: center; }
                .supplier-info { background: #f3f4f6; border: 2px solid #374151; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
                .booking-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .detail-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                .amount-section { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
                .total-amount { font-size: 24px; font-weight: bold; color: #dc2626; }
                .footer { margin-top: 50px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; color: #666; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const totalSupplierCost = booking.cost_per_night * booking.number_of_nights;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>أمر دفع المورد</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef} className="p-6 bg-white" dir="rtl">
          {/* Header */}
          <div className="text-center border-b-2 border-gray-800 pb-6 mb-8">
            <div className="text-3xl font-bold text-blue-600 mb-2">Vogantra</div>
            <div className="text-lg text-gray-600">شركة فوجاتشي للسياحة والسفر</div>
            <div className="text-sm text-gray-500 mt-2">
              العنوان: شارع الهرم - الجيزة | تليفون: 01103442881 | hello@vogantra.com
            </div>
          </div>

          {/* Payment Order Title */}
          <div className="bg-red-600 text-white text-2xl font-bold py-3 px-4 text-center mb-8 rounded">
            أمر دفع للمورد
          </div>

          {/* Supplier Information */}
          <div className="bg-gray-100 border-2 border-gray-600 p-6 rounded mb-8">
            <div className="text-xl font-bold text-gray-800 mb-4">بيانات المورد</div>
            <div className="text-2xl font-bold text-blue-600 mb-2">{booking.supplier_name}</div>
            <div className="text-lg">
              <span className="font-medium">نوع المورد: </span>
              {booking.supplier_name === 'Hotel Direct' ? 'فندق مباشر' : 'وكيل حجوزات'}
            </div>
          </div>

          {/* Booking Reference */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-300 p-4 rounded">
              <div className="font-bold text-gray-600 mb-3">معلومات الحجز</div>
              <div className="mb-2">
                <span className="font-medium">رقم الحجز الداخلي: </span>{booking.internal_booking_number}
              </div>
              <div className="mb-2">
                <span className="font-medium">اسم العميل: </span>{booking.customer_name}
              </div>
              {booking.booking_reference_supplier && (
                <div className="mb-2">
                  <span className="font-medium">مرجع الحجز لدى المورد: </span>
                  <span className="font-bold text-blue-600">{booking.booking_reference_supplier}</span>
                </div>
              )}
            </div>

            <div className="border border-gray-300 p-4 rounded">
              <div className="font-bold text-gray-600 mb-3">تفاصيل الفندق</div>
              <div className="mb-2">
                <span className="font-medium">اسم الفندق: </span>{booking.hotel_name}
              </div>
              <div className="mb-2">
                <span className="font-medium">المدينة: </span>{booking.destination_city}
              </div>
              <div>
                <span className="font-medium">التصنيف: </span>{booking.hotel_star_rating} نجوم
              </div>
            </div>
          </div>

          {/* Stay Details */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-8">
            <div className="bg-gray-100 p-3 font-bold text-gray-700">تفاصيل الإقامة</div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="font-medium text-gray-600">تاريخ الوصول: </span>
                  <div className="text-lg font-bold text-blue-600">
                    {new Date(booking.check_in_date).toLocaleDateString('ar')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">تاريخ المغادرة: </span>
                  <div className="text-lg font-bold text-blue-600">
                    {new Date(booking.check_out_date).toLocaleDateString('ar')}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">عدد الليالي: </span>
                  <div className="text-lg font-bold">{booking.number_of_nights} ليلة</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-600">نوع الغرفة: </span>
                  <span className="font-bold">{booking.room_type}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">عدد النزلاء: </span>
                  <span className="font-bold">
                    {booking.number_of_adults} بالغ
                    {booking.number_of_children > 0 && ` + ${booking.number_of_children} طفل`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="border border-gray-300 rounded-lg overflow-hidden mb-8">
            <div className="bg-gray-100 p-3 font-bold text-gray-700">تفاصيل التكلفة</div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="border border-gray-200 p-3 rounded">
                  <div className="text-sm text-gray-600 mb-1">السعر لليلة الواحدة</div>
                  <div className="text-xl font-bold text-blue-600">
                    {booking.cost_per_night?.toFixed(2)} جنيه
                  </div>
                </div>
                <div className="border border-gray-200 p-3 rounded">
                  <div className="text-sm text-gray-600 mb-1">عدد الليالي</div>
                  <div className="text-xl font-bold">
                    {booking.number_of_nights} ليلة
                  </div>
                </div>
                <div className="border border-gray-200 p-3 rounded bg-yellow-50">
                  <div className="text-sm text-gray-600 mb-1">إجمالي التكلفة</div>
                  <div className="text-xl font-bold text-red-600">
                    {totalSupplierCost?.toFixed(2)} جنيه
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Amount Section */}
          <div className="bg-yellow-100 border-2 border-yellow-400 p-6 rounded mb-8 text-center">
            <div className="text-lg font-bold text-yellow-800 mb-2">المبلغ المطلوب دفعه</div>
            <div className="text-3xl font-bold text-red-600">
              {totalSupplierCost?.toFixed(2)} جنيه مصري
            </div>
          </div>

          {/* Payment Method */}
          {booking.payment_method && (
            <div className="border border-gray-300 p-4 rounded mb-8">
              <div className="font-bold text-gray-600 mb-2">طريقة الدفع المفضلة</div>
              <div className="text-lg">{booking.payment_method}</div>
            </div>
          )}

          {/* Payment Due Date */}
          {booking.payment_due_date && (
            <div className="bg-red-50 border border-red-200 p-4 rounded mb-8">
              <div className="font-bold text-red-800 mb-2">تاريخ استحقاق الدفع</div>
              <div className="text-lg font-bold text-red-600">
                {new Date(booking.payment_due_date).toLocaleDateString('ar')}
              </div>
            </div>
          )}

          {/* Authorization */}
          <div className="border border-gray-300 p-4 rounded mb-8">
            <div className="font-bold text-gray-600 mb-3">إذن الدفع</div>
            <div className="text-sm text-gray-700 space-y-2">
              <p>بناءً على الحجز المذكور أعلاه، يرجى دفع المبلغ المستحق للمورد المذكور.</p>
              <p>يجب الاحتفاظ بإيصال الدفع وإرساله للمحاسبة.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 mt-8">
              <div className="text-center">
                <div className="border-t border-gray-400 mt-12 pt-2">
                  <div className="font-bold">المحاسب</div>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 mt-12 pt-2">
                  <div className="font-bold">المدير المالي</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-6 border-t border-gray-300 text-gray-600">
            <div className="mb-2">شركة فوجاتشي للسياحة والسفر</div>
            <div className="text-sm">إدارة الحسابات والمدفوعات</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelSupplierPaymentGenerator;
