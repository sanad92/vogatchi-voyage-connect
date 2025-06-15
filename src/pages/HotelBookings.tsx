
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
import { useHotelBookingsPage } from "@/components/hotel-bookings/hooks/useHotelBookingsPage";
import HotelBookingDetails from "@/components/hotel-bookings/details/HotelBookingDetails";
import HotelBookingActions from "@/components/hotel-bookings/details/HotelBookingActions";
import HotelInvoiceDialog from "@/components/hotel-bookings/dialogs/HotelInvoiceDialog";
import HotelPrintDialog from "@/components/hotel-bookings/dialogs/HotelPrintDialog";
import HotelVoucherDialog from "@/components/hotel-bookings/dialogs/HotelVoucherDialog";

const HotelBookings = () => {
  const {
    activeTab, setActiveTab,
    editingBooking, setEditingBooking,
    showPrintInvoice, setShowPrintInvoice,
    showCreateInvoice, setShowCreateInvoice,
    showVoucher, setShowVoucher
  } = useHotelBookingsPage();

  // تعديل الاستعلام ليجلب بيانات الحالة join مع booking_statuses
  const { data: bookings = [], isLoading, refetch } = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select(`
          *,
          booking_status:status_id (
            id,
            name,
            name_ar
          )
        `)
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
                <HotelBookingDetails booking={editingBooking} />

                <HotelBookingActions
                  booking={editingBooking}
                  onBack={() => setActiveTab("list")}
                  onEdit={() => setActiveTab("form")}
                  onInvoice={() => setShowCreateInvoice(true)}
                  onPrint={() => setShowPrintInvoice(true)}
                  onVoucher={() => setShowVoucher(true)}
                />

                <HotelInvoiceDialog
                  open={showCreateInvoice}
                  booking={editingBooking}
                  onClose={() => setShowCreateInvoice(false)}
                />
                <HotelPrintDialog
                  open={showPrintInvoice}
                  booking={editingBooking}
                  onClose={() => setShowPrintInvoice(false)}
                />
                <HotelVoucherDialog
                  open={showVoucher}
                  booking={editingBooking}
                  onClose={() => setShowVoucher(false)}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HotelBookings;

