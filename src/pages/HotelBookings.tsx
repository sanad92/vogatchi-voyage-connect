
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

const HotelBookings = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [editingBooking, setEditingBooking] = useState<HotelBooking | null>(null);

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
                حجز فندق جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HotelBookingForm 
                booking={null}
                onSuccess={handleFormSuccess}
                onCancel={() => setActiveTab("list")}
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

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setActiveTab("list")}>
                    رجوع للقائمة
                  </Button>
                  <Button onClick={() => setActiveTab("form")}>
                    تعديل الحجز
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HotelBookings;
