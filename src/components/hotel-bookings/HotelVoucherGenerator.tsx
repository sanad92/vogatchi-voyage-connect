
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { HotelBooking, BookingSpecialRequest } from "@/types/hotelBooking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

interface HotelVoucherGeneratorProps {
  booking: HotelBooking;
  onClose?: () => void;
}

const HotelVoucherGenerator = ({ booking, onClose }: HotelVoucherGeneratorProps) => {
  const [specialRequests, setSpecialRequests] = useState<BookingSpecialRequest[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: org } = useCurrentOrganization();
  const orgName = org?.name || 'مؤسستي';
  const orgLogo = org?.logo_url || '';
  const orgContact = [org?.address, org?.phone, org?.email].filter(Boolean).join(' | ');

  useEffect(() => {
    const fetchSpecialRequests = async () => {
      const { data, error } = await supabase
        .from('booking_special_requests')
        .select(`
          *,
          special_request_type:special_request_types(*)
        `)
        .eq('booking_id', booking.id);

      if (error) {
        console.error('Error fetching special requests:', error);
        return;
      }

      setSpecialRequests(data || []);
    };

    fetchSpecialRequests();
  }, [booking.id]);

  const generateVoucher = async () => {
    setIsGenerating(true);
    try {
      // Group special requests by category
      const groupedRequests = specialRequests.reduce((acc, request) => {
        if (request.special_request_type) {
          const category = request.special_request_type.category;
          if (!acc[category]) acc[category] = [];
          acc[category].push(request.special_request_type.name);
        }
        return acc;
      }, {} as Record<string, string[]>);

      const customRequests = specialRequests
        .filter(req => req.custom_request_text)
        .map(req => req.custom_request_text);

      const categoryLabels = {
        bed_type: 'نوع السرير',
        room_type: 'نوع الغرفة والموقع',
        amenities: 'وسائل الراحة والخدمات',
        accessibility: 'إمكانية الوصول',
        other: 'طلبات أخرى'
      };

      // Generate voucher content
      const voucherContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاوتشر حجز فندق - ${booking.internal_booking_number}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .voucher { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .company-name { color: #3b82f6; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .voucher-title { color: #1f2937; font-size: 24px; margin-bottom: 5px; }
        .booking-number { color: #6b7280; font-size: 16px; }
        .section { margin-bottom: 25px; }
        .section-title { background: #3b82f6; color: white; padding: 10px 15px; margin-bottom: 15px; font-weight: bold; border-radius: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-label { font-weight: bold; color: #374151; }
        .info-value { color: #1f2937; }
        .full-width { grid-column: 1 / -1; }
        .special-requests { background: #f8fafc; padding: 15px; border-radius: 8px; border-right: 4px solid #3b82f6; }
        .request-category { margin-bottom: 12px; }
        .request-category-title { font-weight: bold; color: #3b82f6; margin-bottom: 5px; }
        .request-list { padding-right: 20px; }
        .request-item { color: #374151; margin-bottom: 3px; }
        .custom-requests { background: #fef3cd; padding: 10px; border-radius: 5px; margin-top: 10px; border-right: 4px solid #f59e0b; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; }
        @media print { body { background: white; } .voucher { box-shadow: none; } }
    </style>
</head>
<body>
    <div class="voucher">
        <div class="header">
            ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}" style="height:60px;margin-bottom:10px;object-fit:contain;" />` : ''}
            <div class="company-name">${orgName}</div>
            <div class="voucher-title">فاوتشر حجز فندق</div>
            <div class="booking-number">رقم الحجز: ${booking.internal_booking_number}</div>
            ${orgContact ? `<div style="color:#6b7280;font-size:13px;margin-top:6px;">${orgContact}</div>` : ''}
        </div>

        <div class="section">
            <div class="section-title">معلومات العميل</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">اسم العميل:</span>
                    <span class="info-value">${booking.customer_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">موظف الحجز:</span>
                    <span class="info-value">${booking.booking_agent_name}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">تفاصيل الفندق</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">اسم الفندق:</span>
                    <span class="info-value">${booking.hotel_name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">تصنيف الفندق:</span>
                    <span class="info-value">${booking.hotel_star_rating || 'غير محدد'} نجوم</span>
                </div>
                <div class="info-item">
                    <span class="info-label">المدينة:</span>
                    <span class="info-value">${booking.destination_city}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">نوع الغرفة:</span>
                    <span class="info-value">${booking.room_type}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">تفاصيل الإقامة</div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">تاريخ الوصول:</span>
                    <span class="info-value">${new Date(booking.check_in_date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">تاريخ المغادرة:</span>
                    <span class="info-value">${new Date(booking.check_out_date).toLocaleDateString('ar-EG')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">عدد الليالي:</span>
                    <span class="info-value">${booking.number_of_nights} ليلة</span>
                </div>
                <div class="info-item">
                    <span class="info-label">عدد البالغين:</span>
                    <span class="info-value">${booking.number_of_adults}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">عدد الأطفال:</span>
                    <span class="info-value">${booking.number_of_children}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">نظام الوجبات:</span>
                    <span class="info-value">${booking.meal_plan}</span>
                </div>
                ${booking.children_ages ? `
                <div class="info-item full-width">
                    <span class="info-label">أعمار الأطفال:</span>
                    <span class="info-value">${booking.children_ages}</span>
                </div>
                ` : ''}
            </div>
        </div>

        ${(Object.keys(groupedRequests).length > 0 || customRequests.length > 0) ? `
        <div class="section">
            <div class="section-title">الطلبات الخاصة</div>
            <div class="special-requests">
                ${Object.entries(groupedRequests).map(([category, requests]) => `
                    <div class="request-category">
                        <div class="request-category-title">${categoryLabels[category as keyof typeof categoryLabels]}</div>
                        <ul class="request-list">
                            ${requests.map(request => `<li class="request-item">${request}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
                
                ${customRequests.length > 0 ? `
                    <div class="custom-requests">
                        <strong>طلبات إضافية:</strong><br>
                        ${customRequests.join('<br>')}
                    </div>
                ` : ''}
            </div>
        </div>
        ` : ''}

        ${booking.booking_reference_supplier ? `
        <div class="section">
            <div class="section-title">معلومات إضافية</div>
            <div class="info-grid">
                <div class="info-item full-width">
                    <span class="info-label">مرجع الحجز لدى المورد:</span>
                    <span class="info-value">${booking.booking_reference_supplier}</span>
                </div>
            </div>
        </div>
        ` : ''}

        ${booking.cancellation_policy ? `
        <div class="section">
            <div class="section-title">سياسة الإلغاء</div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-right: 4px solid #ef4444;">
                ${booking.cancellation_policy}
            </div>
        </div>
        ` : ''}

        <div class="footer">
            <p>شكراً لثقتكم في خدماتنا</p>
            <p>Vogantra - وكالة سياحة وسفر</p>
            <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
    </div>
</body>
</html>
      `;

      // Create and download the file
      const blob = new Blob([voucherContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `voucher-${booking.internal_booking_number}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('تم إنشاء الفاوتشر بنجاح');

      // Update voucher sent status
      await supabase
        .from('hotel_bookings')
        .update({ 
          voucher_sent: true,
          voucher_sent_date: new Date().toISOString()
        })
        .eq('id', booking.id);

    } catch (error) {
      console.error('Error generating voucher:', error);
      toast.error('حدث خطأ في إنشاء الفاوتشر');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          إنشاء فاوتشر الحجز
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            إنشاء فاوتشر مفصل للحجز يحتوي على جميع التفاصيل والطلبات الخاصة
          </p>
          
          {specialRequests.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">الطلبات الخاصة المضافة:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {specialRequests.map((request) => (
                  <li key={request.id}>
                    {request.special_request_type 
                      ? `• ${request.special_request_type.name}`
                      : `• ${request.custom_request_text}`
                    }
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <Button 
            onClick={generateVoucher} 
            disabled={isGenerating}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? 'جاري إنشاء الفاوتشر...' : 'تحميل الفاوتشر'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HotelVoucherGenerator;
