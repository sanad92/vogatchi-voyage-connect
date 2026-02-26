
import { useState } from "react";
import BreadcrumbNav from "@/components/ui/breadcrumb-nav";
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

  // تبسيط الاستعلام لتجنب مشاكل join المعقدة
  const { data: bookings = [], isLoading, refetch, error } = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: async () => {
      try {
        console.log('🏨 Fetching hotel bookings...');
        
        // جلب الحجوزات أولاً
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('hotel_bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('❌ Error fetching bookings:', bookingsError);
          throw bookingsError;
        }

        console.log('✅ Bookings fetched:', bookingsData?.length || 0);

        // جلب حالات الحجز بشكل منفصل
        const { data: statusesData, error: statusesError } = await supabase
          .from('booking_statuses')
          .select('*');

        if (statusesError) {
          console.warn('⚠️ Could not fetch booking statuses:', statusesError);
        }

        // دمج البيانات يدوياً
        const bookingsWithStatus = bookingsData?.map(booking => {
          const status = statusesData?.find(s => s.id === booking.status_id);
          return {
            ...booking,
            booking_status: status ? {
              id: status.id,
              name: status.name,
              name_ar: status.name_ar,
              color: status.color
            } : null
          };
        }) || [];

        return bookingsWithStatus as HotelBooking[];
      } catch (error) {
        console.error('❌ Hotel bookings query failed:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000
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

  if (error) {
    console.error('❌ Hotel bookings error:', error);
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-6">
        <div className="text-center py-8">
          <div className="text-destructive mb-4">
            <Hotel className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">خطأ في تحميل الحجوزات</h3>
            <p className="text-muted-foreground mt-2">حدث خطأ في الاتصال بقاعدة البيانات</p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري تحميل الحجوزات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'حجوزات الفنادق' }
      ]} />
      <div className="flex items-center gap-3">
        <Hotel className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">حجوزات الفنادق</h1>
          <p className="text-muted-foreground">إدارة حجوزات الفنادق والإقامة</p>
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
