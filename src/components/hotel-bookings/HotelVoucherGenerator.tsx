
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { HotelBooking } from "@/types/hotelBooking";

interface HotelVoucherGeneratorProps {
  booking: HotelBooking;
  onClose: () => void;
}

const HotelVoucherGenerator = ({ booking, onClose }: HotelVoucherGeneratorProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>فاوتشر الحجز - ${booking.customer_name}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
                .voucher-title { font-size: 24px; font-weight: bold; margin: 20px 0; background: #2563eb; color: white; padding: 10px; text-align: center; }
                .booking-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .detail-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                .detail-label { font-weight: bold; color: #666; margin-bottom: 5px; }
                .detail-value { font-size: 16px; }
                .important-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>فاوتشر الحجز</DialogTitle>
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
            <div className="text-3xl font-bold text-blue-600 mb-2">Vogatchi Trips</div>
            <div className="text-lg text-gray-600">شركة فوجاتشي للسياحة والسفر</div>
            <div className="text-sm text-gray-500 mt-2">
              العنوان: شارع الهرم - الجيزة | تليفون: 01234567890 | info@vogatchitrips.com
            </div>
          </div>

          {/* Voucher Title */}
          <div className="bg-blue-600 text-white text-2xl font-bold py-3 px-4 text-center mb-8 rounded">
            فاوتشر حجز فندق
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-300 p-4 rounded">
              <div className="font-bold text-gray-600 mb-3">بيانات النزيل</div>
              <div className="mb-2">
                <span className="font-medium">الاسم: </span>{booking.customer_name}
              </div>
              <div className="mb-2">
                <span className="font-medium">رقم الحجز: </span>{booking.internal_booking_number}
              </div>
              <div>
                <span className="font-medium">تاريخ الحجز: </span>
                {new Date(booking.booking_date).toLocaleDateString('ar')}
              </div>
            </div>

            <div className="border border-gray-300 p-4 rounded">
              <div className="font-bold text-gray-600 mb-3">معلومات الفندق</div>
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
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="mb-3">
                  <span className="font-medium text-gray-600">تاريخ الوصول: </span>
                  <span className="text-lg font-bold text-blue-600">
                    {new Date(booking.check_in_date).toLocaleDateString('ar')}
                  </span>
                </div>
                <div className="mb-3">
                  <span className="font-medium text-gray-600">تاريخ المغادرة: </span>
                  <span className="text-lg font-bold text-blue-600">
                    {new Date(booking.check_out_date).toLocaleDateString('ar')}
                  </span>
                </div>
                <div className="mb-3">
                  <span className="font-medium text-gray-600">عدد الليالي: </span>
                  <span className="text-lg font-bold">{booking.number_of_nights} ليلة</span>
                </div>
              </div>
              <div>
                <div className="mb-3">
                  <span className="font-medium text-gray-600">نوع الغرفة: </span>
                  <span className="font-bold">{booking.room_type}</span>
                </div>
                <div className="mb-3">
                  <span className="font-medium text-gray-600">عدد النزلاء: </span>
                  <span className="font-bold">
                    {booking.number_of_adults} بالغ
                    {booking.number_of_children > 0 && ` + ${booking.number_of_children} طفل`}
                  </span>
                </div>
                <div className="mb-3">
                  <span className="font-medium text-gray-600">نظام الوجبات: </span>
                  <span className="font-bold">{booking.meal_plan}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Children Ages */}
          {booking.children_ages && (
            <div className="border border-gray-300 p-4 rounded mb-8">
              <div className="font-bold text-gray-600 mb-2">أعمار الأطفال</div>
              <div>{booking.children_ages}</div>
            </div>
          )}

          {/* Hotel Reference */}
          {booking.booking_reference_supplier && (
            <div className="border border-gray-300 p-4 rounded mb-8">
              <div className="font-bold text-gray-600 mb-2">مرجع الحجز لدى الفندق</div>
              <div className="text-lg font-bold text-blue-600">{booking.booking_reference_supplier}</div>
            </div>
          )}

          {/* Cancellation Policy */}
          {booking.cancellation_policy && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-8">
              <div className="font-bold text-yellow-800 mb-2">سياسة الإلغاء</div>
              <div className="text-yellow-700">{booking.cancellation_policy}</div>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-8">
            <div className="font-bold text-red-800 mb-3">ملاحظات هامة</div>
            <ul className="text-red-700 space-y-2">
              <li>• يرجى إحضار هذا الفاوتشر عند الوصول إلى الفندق</li>
              <li>• يرجى إحضار جواز السفر أو البطاقة الشخصية</li>
              <li>• وقت تسليم الغرف عادة من الساعة 2:00 ظهراً</li>
              <li>• وقت مغادرة الغرف عادة قبل الساعة 12:00 ظهراً</li>
              <li>• في حالة أي استفسار يرجى التواصل مع شركة فوجاتشي</li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="border border-gray-300 p-4 rounded mb-8">
            <div className="font-bold text-gray-600 mb-3">للتواصل والاستفسارات</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2">
                  <span className="font-medium">الهاتف: </span>01234567890
                </div>
                <div className="mb-2">
                  <span className="font-medium">الإيميل: </span>info@vogatchitrips.com
                </div>
              </div>
              <div>
                <div className="mb-2">
                  <span className="font-medium">العنوان: </span>شارع الهرم - الجيزة
                </div>
                <div className="mb-2">
                  <span className="font-medium">موظف الحجز: </span>{booking.booking_agent_name}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-6 border-t border-gray-300 text-gray-600">
            <div className="mb-2 text-lg font-bold text-blue-600">نتمنى لكم إقامة ممتعة</div>
            <div className="text-sm">شكراً لاختياركم شركة فوجاتشي للسياحة والسفر</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelVoucherGenerator;
