import React, { useState } from "react";
import HotelInvoiceGenerator from "@/components/hotel-bookings/HotelInvoiceGenerator";
import HotelVoucherGenerator from "@/components/hotel-bookings/HotelVoucherGenerator";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Printer, Search } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";

const Invoices = () => {
  const [selectedHotelBooking, setSelectedHotelBooking] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", debouncedSearchTerm, filterStatus, filterType],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(id, name, email, phone),
          hotel_booking:hotel_bookings!invoices_booking_id_fkey(
            id, customer_name, hotel_name, destination_city, check_in_date, 
            check_out_date, internal_booking_number, voucher_sent
          ),
          flight_booking:flight_bookings!invoices_booking_id_fkey(
            id, customer_name, airline_name, departure_city, arrival_city, 
            departure_date, booking_reference
          ),
          transport_booking:transport_bookings!invoices_booking_id_fkey(
            id, customer_name, service_type, pickup_location, dropoff_location, 
            service_date, booking_reference
          ),
          car_rental:car_rentals!invoices_booking_id_fkey(
            id, customer_name, vehicle_make, vehicle_model, pickup_date, 
            return_date, rental_reference
          )
        `)
        .order("created_at", { ascending: false });

      // Apply search filter if provided
      if (debouncedSearchTerm) {
        query = query.or(`
          invoice_number.ilike.%${debouncedSearchTerm}%,
          customer.name.ilike.%${debouncedSearchTerm}%,
          hotel_booking.hotel_name.ilike.%${debouncedSearchTerm}%,
          flight_booking.airline_name.ilike.%${debouncedSearchTerm}%
        `);
      }

      // Apply status filter
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      // Apply booking type filter
      if (filterType !== "all") {
        query = query.eq("booking_type", filterType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching invoices:", error);
        throw error;
      }

      return data;
    },
  });

  const getBookingDetails = (invoice) => {
    switch (invoice.booking_type) {
      case "hotel":
        return {
          booking: invoice.hotel_booking,
          title: invoice.hotel_booking?.hotel_name,
          subtitle: invoice.hotel_booking?.destination_city,
          date: invoice.hotel_booking?.check_in_date,
          reference: invoice.hotel_booking?.internal_booking_number,
        };
      case "flight":
        return {
          booking: invoice.flight_booking,
          title: invoice.flight_booking?.airline_name,
          subtitle: `${invoice.flight_booking?.departure_city} → ${invoice.flight_booking?.arrival_city}`,
          date: invoice.flight_booking?.departure_date,
          reference: invoice.flight_booking?.booking_reference,
        };
      case "transport":
        return {
          booking: invoice.transport_booking,
          title: invoice.transport_booking?.service_type,
          subtitle: `${invoice.transport_booking?.pickup_location} → ${invoice.transport_booking?.dropoff_location}`,
          date: invoice.transport_booking?.service_date,
          reference: invoice.transport_booking?.booking_reference,
        };
      case "car_rental":
        return {
          booking: invoice.car_rental,
          title: `${invoice.car_rental?.vehicle_make} ${invoice.car_rental?.vehicle_model}`,
          subtitle: "إيجار سيارة",
          date: invoice.car_rental?.pickup_date,
          reference: invoice.car_rental?.rental_reference,
        };
      default:
        return {
          booking: null,
          title: "غير معروف",
          subtitle: "",
          date: null,
          reference: "",
        };
    }
  };

  const getBookingTypeLabel = (type) => {
    const types = {
      hotel: "حجز فندق",
      flight: "حجز طيران",
      transport: "حجز نقل",
      car_rental: "إيجار سيارة",
    };
    return types[type] || type;
  };

  const getStatusLabel = (status) => {
    const statuses = {
      draft: "مسودة",
      sent: "مرسلة",
      paid: "مدفوعة",
      overdue: "متأخرة",
      cancelled: "ملغاة",
    };
    return statuses[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-orange-100 text-orange-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">الفواتير</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تصفية الفواتير</CardTitle>
          <CardDescription>استخدم الخيارات أدناه للبحث وتصفية الفواتير</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">بحث</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="رقم الفاتورة، اسم العميل..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">حالة الفاتورة</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="sent">مرسلة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="overdue">متأخرة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">نوع الحجز</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="hotel">حجز فندق</SelectItem>
                  <SelectItem value="flight">حجز طيران</SelectItem>
                  <SelectItem value="transport">حجز نقل</SelectItem>
                  <SelectItem value="car_rental">إيجار سيارة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>
            {isLoading
              ? "جاري تحميل الفواتير..."
              : `${invoices?.length || 0} فاتورة`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 rtl:space-x-reverse">
                    <Skeleton className="h-12 w-12" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-10 w-[100px]" />
                  </div>
                ))}
            </div>
          ) : invoices?.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              لا توجد فواتير تطابق معايير البحث
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-4 font-medium">رقم الفاتورة</th>
                    <th className="text-right py-3 px-4 font-medium">العميل</th>
                    <th className="text-right py-3 px-4 font-medium">نوع الحجز</th>
                    <th className="text-right py-3 px-4 font-medium">التفاصيل</th>
                    <th className="text-right py-3 px-4 font-medium">المبلغ</th>
                    <th className="text-right py-3 px-4 font-medium">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices?.map((invoice) => {
                    const bookingDetails = getBookingDetails(invoice);
                    return (
                      <tr key={invoice.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{invoice.invoice_number}</td>
                        <td className="py-3 px-4">
                          {invoice.customer?.name || bookingDetails.booking?.customer_name || "غير معروف"}
                        </td>
                        <td className="py-3 px-4">
                          {getBookingTypeLabel(invoice.booking_type)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{bookingDetails.title}</div>
                          <div className="text-sm text-gray-500">
                            {bookingDetails.subtitle}
                          </div>
                          {bookingDetails.date && (
                            <div className="text-xs text-gray-500">
                              {format(new Date(bookingDetails.date), "d MMM yyyy", {
                                locale: ar,
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {invoice.final_amount?.toLocaleString()} ج.م
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {invoice.booking_type === "hotel" && bookingDetails.booking && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedHotelBooking(bookingDetails.booking);
                                    setShowInvoiceModal(true);
                                  }}
                                >
                                  <Printer className="h-4 w-4 mr-1" />
                                  طباعة
                                </Button>
                                {!bookingDetails.booking.voucher_sent && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedHotelBooking(bookingDetails.booking);
                                      setShowVoucherModal(true);
                                    }}
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    فاوتشر
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showInvoiceModal && selectedHotelBooking && (
        <HotelInvoiceGenerator
          booking={selectedHotelBooking}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedHotelBooking(null);
          }}
        />
      )}
      
      {showVoucherModal && selectedHotelBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full relative">
            <button
              aria-label="إغلاق"
              className="absolute top-2 left-2 text-gray-400 text-xl"
              onClick={() => setShowVoucherModal(false)}
            >
              &times;
            </button>
            <HotelVoucherGenerator
              booking={selectedHotelBooking}
              onClose={() => setShowVoucherModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
