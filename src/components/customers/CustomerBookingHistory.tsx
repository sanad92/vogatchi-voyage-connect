import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Plane, 
  Car, 
  Bus, 
  Calendar, 
  DollarSign, 
  Eye,
  FileText,
  Download
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomerBookingHistoryProps {
  customerId: string;
}

interface Booking {
  id: string;
  type: 'hotel' | 'flight' | 'car_rental' | 'transport';
  reference: string;
  created_at: string;
  status: string;
  total_amount: number;
  currency: string;
  details: any;
}

const CustomerBookingHistory = ({ customerId }: CustomerBookingHistoryProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchBookings();
  }, [customerId]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all booking types for this customer
      const [hotelBookings, flightBookings, carRentals, transportBookings] = await Promise.all([
        supabase
          .from('hotel_bookings')
          .select(`
            id,
            internal_booking_number,
            created_at,
            hotel_name,
            check_in_date,
            check_out_date,
            total_cost_customer,
            currency,
            status_id,
            booking_statuses(name_ar)
          `)
          .eq('customer_id', customerId),
        
        supabase
          .from('flight_bookings')
          .select(`
            id,
            booking_reference,
            created_at,
            departure_airport_id,
            arrival_airport_id,
            departure_date,
            total_cost,
            currency,
            status_id,
            booking_statuses(name_ar),
            departure_airport:airports(iata_code, name),
            arrival_airport:airports(iata_code, name)
          `)
          .eq('customer_id', customerId),
        
        supabase
          .from('car_rentals')
          .select(`
            id,
            rental_reference,
            created_at,
            pickup_location,
            rental_start_date,
            rental_end_date,
            total_rental_cost,
            currency,
            status_id,
            booking_statuses(name_ar)
          `)
          .eq('customer_id', customerId),
        
        Promise.resolve({ data: [], error: null }) // Transport bookings table might not exist yet
      ]);

      // Combine and format all bookings
      const allBookings: Booking[] = [
        ...(hotelBookings.data || []).map(booking => ({
          id: booking.id,
          type: 'hotel' as const,
          reference: booking.internal_booking_number,
          created_at: booking.created_at,
          status: booking.booking_statuses?.name_ar || 'غير محدد',
          total_amount: booking.total_cost_customer || 0,
          currency: booking.currency || 'EGP',
          details: {
            hotel_name: booking.hotel_name,
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date
          }
        })),
        
        ...(flightBookings.data || []).map(booking => ({
          id: booking.id,
          type: 'flight' as const,
          reference: booking.booking_reference,
          created_at: booking.created_at,
          status: booking.booking_statuses?.name_ar || 'غير محدد',
          total_amount: booking.total_cost || 0,
          currency: booking.currency || 'EGP',
          details: {
            departure_airport: booking.departure_airport,
            arrival_airport: booking.arrival_airport,
            departure_date: booking.departure_date
          }
        })),
        
        ...(carRentals.data || []).map(booking => ({
          id: booking.id,
          type: 'car_rental' as const,
          reference: booking.rental_reference,
          created_at: booking.created_at,
          status: booking.booking_statuses?.name_ar || 'غير محدد',
          total_amount: booking.total_rental_cost || 0,
          currency: booking.currency || 'EGP',
          details: {
            pickup_location: booking.pickup_location,
            rental_start_date: booking.rental_start_date,
            rental_end_date: booking.rental_end_date
          }
        })),
        
        // Transport bookings temporarily disabled
        // ...(transportBookings.data || []).map(booking => ({
        //   id: booking.id,
        //   type: 'transport' as const,
        //   reference: booking.booking_reference,
        //   created_at: booking.created_at,
        //   status: booking.booking_statuses?.name_ar || 'غير محدد',
        //   total_amount: booking.total_cost || 0,
        //   currency: booking.currency || 'EGP',
        //   details: {
        //     pickup_location: booking.pickup_location,
        //     travel_date: booking.travel_date
        //   }
        // }))
      ];

      // Sort by creation date (newest first)
      allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setBookings(allBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('حدث خطأ في تحميل سجل الحجوزات');
    } finally {
      setIsLoading(false);
    }
  };

  const getBookingIcon = (type: string) => {
    switch (type) {
      case 'hotel': return <Package className="h-4 w-4" />;
      case 'flight': return <Plane className="h-4 w-4" />;
      case 'car_rental': return <Car className="h-4 w-4" />;
      case 'transport': return <Bus className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getBookingTypeLabel = (type: string) => {
    switch (type) {
      case 'hotel': return 'حجز فندق';
      case 'flight': return 'حجز طيران';
      case 'car_rental': return 'تأجير سيارة';
      case 'transport': return 'حجز نقل';
      default: return 'حجز';
    }
  };

  const getFilteredBookings = () => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(booking => booking.type === activeTab);
  };

  const exportBookingsData = () => {
    const exportData = {
      customer_id: customerId,
      bookings: getFilteredBookings(),
      export_date: new Date().toISOString(),
      total_bookings: getFilteredBookings().length,
      total_amount: getFilteredBookings().reduce((sum, booking) => sum + booking.total_amount, 0)
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `customer-bookings-${customerId}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('تم تصدير سجل الحجوزات بنجاح');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="mr-2">جاري تحميل سجل الحجوزات...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredBookings = getFilteredBookings();
  const totalAmount = filteredBookings.reduce((sum, booking) => sum + booking.total_amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{filteredBookings.length}</div>
            <div className="text-sm text-muted-foreground">إجمالي الحجوزات</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">إجمالي المبلغ (ج.م)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {filteredBookings.length > 0 ? Math.round(totalAmount / filteredBookings.length).toLocaleString() : 0}
            </div>
            <div className="text-sm text-muted-foreground">متوسط قيمة الحجز</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={exportBookingsData}>
          <Download className="h-4 w-4 mr-2" />
          تصدير البيانات
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">جميع الحجوزات</TabsTrigger>
          <TabsTrigger value="hotel">الفنادق</TabsTrigger>
          <TabsTrigger value="flight">الطيران</TabsTrigger>
          <TabsTrigger value="car_rental">السيارات</TabsTrigger>
          <TabsTrigger value="transport">النقل</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">لا توجد حجوزات من هذا النوع</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          {getBookingIcon(booking.type)}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {getBookingTypeLabel(booking.type)}
                            <Badge variant="outline">{booking.reference}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {booking.type === 'hotel' && booking.details.hotel_name}
                            {booking.type === 'flight' && 
                              `${booking.details.departure_airport?.iata_code} → ${booking.details.arrival_airport?.iata_code}`
                            }
                            {booking.type === 'car_rental' && booking.details.pickup_location}
                            {booking.type === 'transport' && booking.details.pickup_location}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left">
                        <div className="font-semibold">
                          {booking.total_amount.toLocaleString()} {booking.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(booking.created_at)}
                        </div>
                        <Badge variant="secondary" className="mt-1">
                          {booking.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                      {booking.type === 'hotel' && (
                        <>
                          <div>
                            <span className="text-muted-foreground">تاريخ الوصول: </span>
                            {formatDate(booking.details.check_in_date)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">تاريخ المغادرة: </span>
                            {formatDate(booking.details.check_out_date)}
                          </div>
                        </>
                      )}
                      
                      {booking.type === 'flight' && (
                        <div>
                          <span className="text-muted-foreground">تاريخ الرحلة: </span>
                          {formatDate(booking.details.departure_date)}
                        </div>
                      )}
                      
                      {booking.type === 'car_rental' && (
                        <>
                          <div>
                            <span className="text-muted-foreground">بداية الإيجار: </span>
                            {formatDate(booking.details.rental_start_date)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">نهاية الإيجار: </span>
                            {formatDate(booking.details.rental_end_date)}
                          </div>
                        </>
                      )}
                      
                      {booking.type === 'transport' && (
                        <div>
                          <span className="text-muted-foreground">تاريخ السفر: </span>
                          {formatDate(booking.details.travel_date)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerBookingHistory;