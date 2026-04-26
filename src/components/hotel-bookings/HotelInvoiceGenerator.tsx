
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Download } from "lucide-react";
import { HotelBooking } from "@/types/hotelBooking";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

interface HotelInvoiceGeneratorProps {
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

const HotelInvoiceGenerator = ({ booking, onClose }: HotelInvoiceGeneratorProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: org } = useCurrentOrganization();
  const orgName = org?.name || 'مؤسستي';
  const orgPhone = org?.phone || '';
  const orgEmail = org?.email || '';
  const orgAddress = org?.address || '';
  const orgLogo = org?.logo_url || '';

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>فاتورة - ${escapeHtml(booking.customer_name)}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
                .invoice-title { font-size: 24px; font-weight: bold; margin: 20px 0; }
                .booking-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .detail-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
                .detail-label { font-weight: bold; color: #666; margin-bottom: 5px; }
                .detail-value { font-size: 16px; }
                .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: right; }
                .table th { background-color: #f5f5f5; font-weight: bold; }
                .total-section { text-align: left; margin-top: 30px; }
                .total-amount { font-size: 20px; font-weight: bold; color: #2563eb; }
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
          <DialogTitle>فاتورة العميل</DialogTitle>
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
            {orgLogo && (
              <img src={orgLogo} alt={orgName} className="h-16 mx-auto mb-3 object-contain" />
            )}
            <div className="text-3xl font-bold text-blue-600 mb-2">{orgName}</div>
            {(orgAddress || orgPhone || orgEmail) && (
              <div className="text-sm text-gray-500 mt-2">
                {[orgAddress, orgPhone && `تليفون: ${orgPhone}`, orgEmail].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>

          {/* Invoice Title */}
          <div className="text-center text-2xl font-bold mb-8 text-gray-800">
            فاتورة حجز فندق
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-300 p-4 rounded">
              <div className="font-bold text-gray-600 mb-2">بيانات العميل</div>
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
              <div className="font-bold text-gray-600 mb-2">تفاصيل الإقامة</div>
              <div className="mb-2">
                <span className="font-medium">الفندق: </span>{booking.hotel_name}
              </div>
              <div className="mb-2">
                <span className="font-medium">المدينة: </span>{booking.destination_city}
              </div>
              <div>
                <span className="font-medium">التصنيف: </span>{booking.hotel_star_rating} نجوم
              </div>
            </div>
          </div>

          {/* Hotel and Stay Details */}
          <table className="w-full border-collapse border border-gray-300 mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-right">البيان</th>
                <th className="border border-gray-300 p-3 text-right">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">تاريخ الوصول</td>
                <td className="border border-gray-300 p-3">
                  {new Date(booking.check_in_date).toLocaleDateString('ar')}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">تاريخ المغادرة</td>
                <td className="border border-gray-300 p-3">
                  {new Date(booking.check_out_date).toLocaleDateString('ar')}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">عدد الليالي</td>
                <td className="border border-gray-300 p-3">{booking.number_of_nights} ليلة</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">نوع الغرفة</td>
                <td className="border border-gray-300 p-3">{booking.room_type}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">عدد النزلاء</td>
                <td className="border border-gray-300 p-3">
                  {booking.number_of_adults} بالغ
                  {booking.number_of_children > 0 && ` + ${booking.number_of_children} طفل`}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-medium">نظام الوجبات</td>
                <td className="border border-gray-300 p-3">{booking.meal_plan}</td>
              </tr>
            </tbody>
          </table>

          {/* Pricing */}
          <table className="w-full border-collapse border border-gray-300 mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-right">الخدمة</th>
                <th className="border border-gray-300 p-3 text-center">السعر لليلة</th>
                <th className="border border-gray-300 p-3 text-center">عدد الليالي</th>
                <th className="border border-gray-300 p-3 text-center">المجموع</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3">إقامة فندقية - {booking.hotel_name}</td>
                <td className="border border-gray-300 p-3 text-center">
                  {booking.selling_price_per_night?.toFixed(2)} جنيه
                </td>
                <td className="border border-gray-300 p-3 text-center">{booking.number_of_nights}</td>
                <td className="border border-gray-300 p-3 text-center font-bold">
                  {booking.total_cost_customer?.toFixed(2)} جنيه
                </td>
              </tr>
            </tbody>
          </table>

          {/* Total */}
          <div className="text-left mb-8">
            <div className="text-2xl font-bold text-blue-600">
              المجموع الكلي: {booking.total_cost_customer?.toFixed(2)} جنيه مصري
            </div>
          </div>

          {/* Payment Information */}
          {booking.payment_method && (
            <div className="mb-8">
              <div className="font-bold text-gray-700 mb-2">بيانات الدفع</div>
              <div className="border border-gray-300 p-4 rounded bg-gray-50">
                <div className="mb-2">
                  <span className="font-medium">طريقة الدفع: </span>{booking.payment_method}
                </div>
                <div className="mb-2">
                  <span className="font-medium">المبلغ المدفوع: </span>
                  {booking.paid_amount?.toFixed(2)} جنيه
                </div>
                <div className="mb-2">
                  <span className="font-medium">المبلغ المتبقي: </span>
                  {booking.remaining_amount?.toFixed(2)} جنيه
                </div>
                {booking.payment_due_date && (
                  <div>
                    <span className="font-medium">تاريخ الاستحقاق: </span>
                    {new Date(booking.payment_due_date).toLocaleDateString('ar')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-12 pt-6 border-t border-gray-300 text-gray-600">
            <div className="mb-2">شكراً لاختياركم {orgName}</div>
            <div className="text-sm">نتمنى لكم رحلة ممتعة وإقامة مريحة</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelInvoiceGenerator;
