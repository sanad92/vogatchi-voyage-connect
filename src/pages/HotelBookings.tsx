import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hotel, Plus } from "lucide-react";
import HotelBookingForm from "@/components/hotel-bookings/HotelBookingForm";
import HotelBookingsList from "@/components/hotel-bookings/HotelBookingsList";
import { HotelBooking } from "@/types/hotelBooking";
import HotelInvoiceGenerator from "@/components/hotel-bookings/HotelInvoiceGenerator";
import HotelVoucherGenerator from "@/components/hotel-bookings/HotelVoucherGenerator";
import HotelInvoiceCreator from "@/components/hotel-bookings/HotelInvoiceCreator";
import { Printer, FileText } from "lucide-react";
import { toast } from "sonner";

const HotelBookings = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [editingBooking, setEditingBooking] = useState<HotelBooking | null>(null);
  const [showPrintInvoice, setShowPrintInvoice] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);

  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as HotelBooking[];
    }
  });

  const handleNewBooking = () => {
    setEditingBooking(null);
    setActiveTab("form");
  };

  const handleEditBooking = (booking: HotelBooking) => {
    setEditingBooking(booking);
    setActiveTab("details");
  };

  const handleFormSuccess = () => {
    setActiveTab("list");
    setEditingBooking(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">جاري تحميل الحجوزات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Hotel className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">حجوزات الفنادق</h1>
          <p className="text-gray-600">إدارة حجوزات الفنادق والإقامة</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">قائمة الحجوزات</TabsTrigger>
          <TabsTrigger value="form">حجز جديد</TabsTrigger>
          <TabsTrigger value="details" disabled={!editingBooking}>
            تفاصيل الحجز
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <HotelBookingsList 
            bookings={bookings}
            onEdit={handleEditBooking}
            onRefresh={refetch}
            onCreateNew={handleNewBooking}
          />
        </TabsContent>

        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hotel className="h-5 w-5" />
                {editingBooking
                  ? `تعديل حجز الفندق رقم ${editingBooking.internal_booking_number}`
                  : "حجز فندق جديد"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HotelBookingForm 
                booking={editingBooking}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setActiveTab("list");
                  setEditingBooking(null);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {editingBooking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  تفاصيل حجز الفندق - {editingBooking.internal_booking_number}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* معلومات العميل */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">معلومات العميل</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>اسم العميل:</strong> {editingBooking.customer_name}</p>
                      <p><strong>وكيل الحجز:</strong> {editingBooking.booking_agent_name}</p>
                      <p><strong>رقم الحجز:</strong> {editingBooking.internal_booking_number}</p>
                      <p><strong>تاريخ الحجز:</strong> {editingBooking.booking_date}</p>
                    </div>
                  </div>

                  {/* تفاصيل الفندق */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">تفاصيل الفندق</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>اسم الفندق:</strong> {editingBooking.hotel_name}</p>
                      <p><strong>المدينة:</strong> {editingBooking.destination_city}</p>
                      <p><strong>نوع الغرفة:</strong> {editingBooking.room_type}</p>
                      <p><strong>خطة الوجبات:</strong> {editingBooking.meal_plan}</p>
                      <p><strong>تقييم الفندق:</strong> {editingBooking.hotel_star_rating} نجوم</p>
                    </div>
                  </div>

                  {/* تفاصيل الإقامة */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">تفاصيل الإقامة</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>تاريخ الوصول:</strong> {editingBooking.check_in_date}</p>
                      <p><strong>تاريخ المغادرة:</strong> {editingBooking.check_out_date}</p>
                      <p><strong>عدد الليالي:</strong> {editingBooking.number_of_nights}</p>
                      <p><strong>عدد البالغين:</strong> {editingBooking.number_of_adults}</p>
                      <p><strong>عدد الأطفال:</strong> {editingBooking.number_of_children}</p>
                    </div>
                  </div>

                  {/* المعلومات المالية */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">المعلومات المالية</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>سعر البيع/ليلة:</strong> {editingBooking.selling_price_per_night} {editingBooking.currency}</p>
                      <p><strong>التكلفة/ليلة:</strong> {editingBooking.cost_per_night} {editingBooking.currency}</p>
                      <p><strong>إجمالي المبلغ:</strong> {editingBooking.total_cost_customer} {editingBooking.currency}</p>
                      <p><strong>الربح الإجمالي:</strong> {editingBooking.total_profit} {editingBooking.currency}</p>
                      <p><strong>المبلغ المدفوع:</strong> {editingBooking.paid_amount} {editingBooking.currency}</p>
                      <p><strong>المتبقي:</strong> {editingBooking.remaining_amount} {editingBooking.currency}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 justify-end">
                  {/* زر الرجوع والتعديل الأساسيين */}
                  <Button variant="outline" onClick={() => setActiveTab("list")}>
                    رجوع للقائمة
                  </Button>
                  <Button onClick={() => setActiveTab("form")}>
                    تعديل الحجز
                  </Button>

                  {/* زر إصدار الفاتورة (يظهر فقط إذا لم تُصدر) */}
                  {!editingBooking.invoice_sent && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowCreateInvoice(true)}
                    >
                      <FileText className="h-4 w-4 ml-1" />
                      إصدار فاتورة
                    </Button>
                  )}

                  {/* زر طباعة الفاتورة (يظهر فقط إذا تم إصدار الفاتورة) */}
                  {editingBooking.invoice_sent && (
                    <Button
                      variant="secondary"
                      onClick={() => setShowPrintInvoice(true)}
                    >
                      <Printer className="h-4 w-4 ml-1" />
                      طباعة الفاتورة
                    </Button>
                  )}

                  {/* زر إنشاء الفاوتشر (يظهر دائماً) */}
                  <Button
                    variant="outline"
                    onClick={() => setShowVoucher(true)}
                  >
                    <FileText className="h-4 w-4 ml-1" />
                    إنشاء فاوتشر
                  </Button>
                </div>

                {/* حوار إصدار الفاتورة */}
                {showCreateInvoice && (
                  <HotelInvoiceCreator
                    booking={editingBooking}
                    open={showCreateInvoice}
                    onClose={() => {
                      setShowCreateInvoice(false);
                      toast.success("تم إصدار الفاتورة بنجاح");
                    }}
                  />
                )}
                {/* حوار طباعة الفاتورة */}
                {showPrintInvoice && (
                  <HotelInvoiceGenerator
                    booking={editingBooking}
                    onClose={() => setShowPrintInvoice(false)}
                  />
                )}
                {/* حوار الفاوتشر */}
                {showVoucher && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full relative">
                      <button
                        aria-label="إغلاق"
                        className="absolute top-2 left-2 text-gray-400 text-xl"
                        onClick={() => setShowVoucher(false)}
                      >
                        &times;
                      </button>
                      <HotelVoucherGenerator
                        booking={editingBooking}
                        onClose={() => setShowVoucher(false)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HotelBookings;
