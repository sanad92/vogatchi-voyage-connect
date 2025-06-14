
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Plane, Calendar, MapPin, Users, DollarSign } from "lucide-react";
import { FlightBooking, PassengerDetail, BaggageInfo } from "@/types/flightBooking";
import BookingStatusBadge from "@/components/hotel-bookings/BookingStatusBadge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface FlightBookingsListProps {
  onCreateNew?: () => void;
  onEditBooking?: (booking: FlightBooking) => void;
}

const FlightBookingsList = ({ onCreateNew, onEditBooking }: FlightBookingsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['flight-bookings', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('flight_bookings')
        .select(`
          *,
          departure_airport:departure_airport_id (
            id,
            name,
            city,
            iata_code
          ),
          arrival_airport:arrival_airport_id (
            id,
            name,
            city,
            iata_code
          ),
          airline:airline_id (
            id,
            name,
            iata_code
          ),
          flight_class:flight_class_id (
            id,
            name,
            name_ar,
            code
          ),
          booking_status:status_id (
            id,
            name,
            name_ar,
            color
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`
          customer_name.ilike.%${searchTerm}%,
          booking_reference.ilike.%${searchTerm}%,
          flight_number.ilike.%${searchTerm}%,
          confirmation_number.ilike.%${searchTerm}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform the data to match our FlightBooking interface with proper type conversion
      return (data || []).map((booking: any): FlightBooking => {
        // Safely parse passenger_details from Json to PassengerDetail[]
        let passengerDetails: PassengerDetail[] = [];
        if (booking.passenger_details) {
          try {
            if (Array.isArray(booking.passenger_details)) {
              passengerDetails = booking.passenger_details.map((passenger: any) => ({
                name: passenger?.name || '',
                passport: passenger?.passport || '',
                date_of_birth: passenger?.date_of_birth || '',
                nationality: passenger?.nationality || ''
              }));
            }
          } catch (e) {
            console.warn('Error parsing passenger details:', e);
            passengerDetails = [];
          }
        }

        // Safely parse baggage_info from Json to BaggageInfo
        let baggageInfo: BaggageInfo = {};
        if (booking.baggage_info && typeof booking.baggage_info === 'object') {
          try {
            baggageInfo = {
              checked: (booking.baggage_info as any)?.checked || '',
              carry_on: (booking.baggage_info as any)?.carry_on || '',
              extra_baggage: (booking.baggage_info as any)?.extra_baggage || ''
            };
          } catch (e) {
            console.warn('Error parsing baggage info:', e);
            baggageInfo = {};
          }
        }

        return {
          id: booking.id,
          booking_reference: booking.booking_reference,
          customer_id: booking.customer_id,
          customer_name: booking.customer_name,
          booking_agent_name: booking.booking_agent_name,
          booking_date: booking.booking_date,
          departure_airport_id: booking.departure_airport_id,
          arrival_airport_id: booking.arrival_airport_id,
          departure_date: booking.departure_date,
          departure_time: booking.departure_time,
          arrival_date: booking.arrival_date,
          arrival_time: booking.arrival_time,
          flight_number: booking.flight_number,
          airline_id: booking.airline_id,
          flight_class_id: booking.flight_class_id,
          number_of_passengers: booking.number_of_passengers,
          passenger_details: passengerDetails,
          baggage_info: baggageInfo,
          special_requests: booking.special_requests,
          meal_preferences: booking.meal_preferences,
          seat_preferences: booking.seat_preferences,
          ticket_price_per_person: booking.ticket_price_per_person,
          taxes_and_fees: booking.taxes_and_fees,
          total_cost: booking.total_cost,
          supplier_cost: booking.supplier_cost,
          total_profit: booking.total_profit,
          currency: booking.currency,
          payment_method: booking.payment_method,
          paid_amount: booking.paid_amount,
          remaining_amount: booking.remaining_amount,
          payment_due_date: booking.payment_due_date,
          status_id: booking.status_id,
          confirmation_number: booking.confirmation_number,
          ticket_numbers: Array.isArray(booking.ticket_numbers) ? booking.ticket_numbers : [],
          is_round_trip: booking.is_round_trip,
          return_flight_id: booking.return_flight_id,
          supplier_name: booking.supplier_name,
          supplier_reference: booking.supplier_reference,
          invoice_sent: booking.invoice_sent,
          invoice_sent_date: booking.invoice_sent_date,
          voucher_sent: booking.voucher_sent,
          voucher_sent_date: booking.voucher_sent_date,
          supplier_payment_sent: booking.supplier_payment_sent,
          supplier_payment_sent_date: booking.supplier_payment_sent_date,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          departure_airport: booking.departure_airport,
          arrival_airport: booking.arrival_airport,
          airline: booking.airline,
          flight_class: booking.flight_class,
          booking_status: booking.booking_status
        };
      });
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: ar });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">جاري تحميل حجوزات الطيران...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* شريط البحث والإجراءات */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث في حجوزات الطيران..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          حجز طيران جديد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي الحجوزات</p>
                <p className="text-2xl font-bold">{bookings.length}</p>
              </div>
              <Plane className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المسافرين</p>
                <p className="text-2xl font-bold">
                  {bookings.reduce((sum, booking) => sum + booking.number_of_passengers, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي المبيعات</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(bookings.reduce((sum, booking) => sum + booking.total_cost, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي الأرباح</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(bookings.reduce((sum, booking) => sum + (booking.total_profit || 0), 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* قائمة الحجوزات */}
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حجوزات طيران</h3>
            <p className="text-gray-500 mb-4">ابدأ بإنشاء حجز طيران جديد</p>
            <Button onClick={onCreateNew}>
              إنشاء حجز جديد
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* معلومات الرحلة الأساسية */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{booking.customer_name}</h3>
                      <Badge variant="outline">{booking.booking_reference}</Badge>
                      {booking.booking_status && (
                        <BookingStatusBadge status={booking.booking_status} />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                      {/* مسار الرحلة */}
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {booking.departure_airport?.iata_code} → {booking.arrival_airport?.iata_code}
                        </span>
                      </div>
                      
                      {/* تاريخ المغادرة */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(booking.departure_date)}</span>
                      </div>
                      
                      {/* شركة الطيران */}
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        <span>
                          {booking.airline?.name}
                          {booking.flight_number && ` - ${booking.flight_number}`}
                        </span>
                      </div>
                      
                      {/* عدد المسافرين */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{booking.number_of_passengers} مسافر</span>
                      </div>
                      
                      {/* درجة السفر */}
                      <div>
                        <Badge variant="secondary">
                          {booking.flight_class?.name_ar}
                        </Badge>
                      </div>
                      
                      {/* تفاصيل الطيران */}
                      <div className="text-xs">
                        {booking.departure_airport?.city} → {booking.arrival_airport?.city}
                      </div>
                    </div>
                  </div>

                  {/* المعلومات المالية والإجراءات */}
                  <div className="flex flex-col lg:items-end gap-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(booking.total_cost)}
                      </p>
                      <p className="text-sm text-gray-500">
                        الربح: {formatCurrency(booking.total_profit || 0)}
                      </p>
                      {booking.remaining_amount && booking.remaining_amount > 0 && (
                        <p className="text-sm text-red-500">
                          متبقي: {formatCurrency(booking.remaining_amount)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onEditBooking?.(booking)}
                      >
                        عرض التفاصيل
                      </Button>
                    </div>
                  </div>
                </div>

                {/* معلومات إضافية */}
                {(booking.special_requests || booking.meal_preferences) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      {booking.special_requests && (
                        <p><strong>طلبات خاصة:</strong> {booking.special_requests}</p>
                      )}
                      {booking.meal_preferences && (
                        <p><strong>تفضيلات الوجبات:</strong> {booking.meal_preferences}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlightBookingsList;
