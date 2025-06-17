
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plane, Users, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentEmployeeEnhanced } from "@/hooks/useCurrentEmployeeEnhanced";

// Import new sections
import TripTypeSelection from "./sections/TripTypeSelection";
import FlightDataSelectionSection from "./sections/FlightDataSelectionSection";
import SupplierSelectionSection from "./sections/SupplierSelectionSection";
import PassengerDetailsEnhanced from "./sections/PassengerDetailsEnhanced";

const flightBookingSchema = z.object({
  // معلومات العميل
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, "اسم العميل مطلوب"),
  
  // نوع الرحلة
  trip_type: z.enum(['one-way', 'round-trip', 'multi-city']),
  
  // تفاصيل الرحلة
  departure_airport_id: z.string().min(1, "مطار المغادرة مطلوب"),
  arrival_airport_id: z.string().min(1, "مطار الوصول مطلوب"),
  departure_date: z.date({ required_error: "تاريخ المغادرة مطلوب" }),
  departure_time: z.string().optional(),
  arrival_date: z.date({ required_error: "تاريخ الوصول مطلوب" }),
  arrival_time: z.string().optional(),
  airline_id: z.string().min(1, "شركة الطيران مطلوبة"),
  flight_class_id: z.string().min(1, "درجة السفر مطلوبة"),
  flight_number: z.string().optional(),
  number_of_passengers: z.number().min(1, "عدد المسافرين يجب أن يكون 1 على الأقل"),
  
  // معلومات المورد
  supplier_id: z.string().min(1, "المورد مطلوب"),
  supplier_cost: z.number().min(0, "تكلفة المورد مطلوبة"),
  
  // التسعير
  ticket_price_per_person: z.number().min(0, "سعر التذكرة مطلوب"),
  taxes_and_fees: z.number().min(0).optional(),
  currency: z.string().min(1, "العملة مطلوبة"),
  
  // الدفع
  paid_amount: z.number().min(0).optional(),
  payment_method: z.string().optional(),
  
  // طلبات إضافية
  special_requests: z.string().optional(),
  meal_preferences: z.string().optional(),
  seat_preferences: z.string().optional(),
});

type FlightBookingFormData = z.infer<typeof flightBookingSchema>;

interface FlightBookingFormEnhancedProps {
  onSuccess?: (booking: any) => void;
  initialData?: Partial<FlightBookingFormData>;
}

const FlightBookingFormEnhanced = ({ onSuccess, initialData }: FlightBookingFormEnhancedProps) => {
  const [passengerDetails, setPassengerDetails] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
  const { currentEmployee, getBookingAgentId, getBookingAgentName } = useCurrentEmployeeEnhanced();
  const queryClient = useQueryClient();

  const form = useForm<FlightBookingFormData>({
    resolver: zodResolver(flightBookingSchema),
    defaultValues: {
      customer_name: initialData?.customer_name || "",
      trip_type: initialData?.trip_type || "one-way",
      number_of_passengers: initialData?.number_of_passengers || 1,
      ticket_price_per_person: initialData?.ticket_price_per_person || 0,
      taxes_and_fees: initialData?.taxes_and_fees || 0,
      supplier_cost: initialData?.supplier_cost || 0,
      currency: initialData?.currency || "EGP",
      paid_amount: initialData?.paid_amount || 0,
    },
  });

  // جلب البيانات الأساسية
  const { data: flightClasses = [] } = useQuery({
    queryKey: ['flight-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flight_classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  // حساب التكلفة الإجمالية تلقائياً
  const ticketPrice = form.watch('ticket_price_per_person');
  const taxesAndFees = form.watch('taxes_and_fees') || 0;
  const numberOfPassengers = form.watch('number_of_passengers');
  const supplierCost = form.watch('supplier_cost');

  const totalCost = (ticketPrice * numberOfPassengers) + taxesAndFees;
  const totalProfit = totalCost - supplierCost;

  const createBookingMutation = useMutation({
    mutationFn: async (data: FlightBookingFormData) => {
      const bookingData = {
        customer_id: selectedCustomer?.id || null,
        customer_name: data.customer_name,
        departure_airport_id: data.departure_airport_id,
        arrival_airport_id: data.arrival_airport_id,
        departure_date: format(data.departure_date, 'yyyy-MM-dd'),
        departure_time: data.departure_time || null,
        arrival_date: format(data.arrival_date, 'yyyy-MM-dd'),
        arrival_time: data.arrival_time || null,
        airline_id: data.airline_id,
        flight_class_id: data.flight_class_id,
        flight_number: data.flight_number || null,
        number_of_passengers: data.number_of_passengers,
        ticket_price_per_person: data.ticket_price_per_person,
        taxes_and_fees: data.taxes_and_fees || 0,
        total_cost: totalCost,
        currency: data.currency,
        supplier_cost: data.supplier_cost,
        supplier_name: selectedSupplier?.name || '',
        booking_agent_id: getBookingAgentId(),
        booking_agent_name: getBookingAgentName(),
        total_profit: totalProfit,
        remaining_amount: totalCost - (data.paid_amount || 0),
        paid_amount: data.paid_amount || 0,
        payment_method: data.payment_method || null,
        special_requests: data.special_requests || null,
        meal_preferences: data.meal_preferences || null,
        seat_preferences: data.seat_preferences || null,
        is_round_trip: data.trip_type === 'round-trip',
        passenger_details: passengerDetails.length > 0 ? passengerDetails : null,
        exchange_rate_to_egp: 1.0,
        booking_date: format(new Date(), 'yyyy-MM-dd'),
      };

      const { data: result, error } = await supabase
        .from('flight_bookings')
        .insert(bookingData)
        .select('*')
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast.success("تم إنشاء حجز الطيران بنجاح");
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
      form.reset();
      setPassengerDetails([]);
      setSelectedCustomer(null);
      setSelectedSupplier(null);
      onSuccess?.(data);
    },
    onError: (error) => {
      console.error('خطأ في إنشاء الحجز:', error);
      toast.error("فشل في إنشاء حجز الطيران");
    }
  });

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      form.setValue('customer_name', customer.name);
      form.setValue('customer_id', customer.id);
    }
  };

  const handleSupplierSelect = (supplierId: string, supplierName: string) => {
    setSelectedSupplier({ id: supplierId, name: supplierName });
    form.setValue('supplier_id', supplierId);
  };

  const onSubmit = (data: FlightBookingFormData) => {
    createBookingMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* نوع الرحلة */}
          <FormField
            control={form.control}
            name="trip_type"
            render={({ field }) => (
              <FormItem>
                <TripTypeSelection
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />

          {/* معلومات العميل */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                معلومات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">اختر عميل موجود</label>
                  <Select onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عميل من القائمة" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم العميل</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل اسم العميل" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* تفاصيل الرحلة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                تفاصيل الرحلة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FlightDataSelectionSection
                departureAirportId={form.watch('departure_airport_id') || ''}
                arrivalAirportId={form.watch('arrival_airport_id') || ''}
                airlineId={form.watch('airline_id') || ''}
                onDepartureAirportChange={(id) => form.setValue('departure_airport_id', id)}
                onArrivalAirportChange={(id) => form.setValue('arrival_airport_id', id)}
                onAirlineChange={(id) => form.setValue('airline_id', id)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>تاريخ المغادرة</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>اختر التاريخ</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="arrival_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>تاريخ الوصول</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>اختر التاريخ</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flight_class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>درجة السفر</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر درجة السفر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flightClasses.map((flightClass) => (
                            <SelectItem key={flightClass.id} value={flightClass.id}>
                              {flightClass.name_ar} ({flightClass.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="number_of_passengers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عدد المسافرين</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flight_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الرحلة (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثل: MS123" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* تفاصيل المسافرين */}
          <PassengerDetailsEnhanced
            passengers={passengerDetails}
            numberOfPassengers={form.watch('number_of_passengers')}
            onChange={setPassengerDetails}
          />

          {/* المعلومات المالية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                المعلومات المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SupplierSelectionSection
                value={selectedSupplier?.id || ''}
                onChange={handleSupplierSelect}
                label="المورد"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العملة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العملة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EGP">جنيه مصري (ج.م)</SelectItem>
                          <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
                          <SelectItem value="SAR">ريال سعودي (ر.س)</SelectItem>
                          <SelectItem value="EUR">يورو (€)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticket_price_per_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر التذكرة للشخص الواحد</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxes_and_fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الضرائب والرسوم</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تكلفة المورد</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paid_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ المدفوع</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ملخص التكاليف */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">ملخص التكاليف:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">إجمالي التذاكر:</span>
                    <div className="font-semibold">
                      {(ticketPrice * numberOfPassengers).toFixed(2)} {form.watch('currency')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">الضرائب والرسوم:</span>
                    <div className="font-semibold">
                      {taxesAndFees.toFixed(2)} {form.watch('currency')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">إجمالي السعر:</span>
                    <div className="font-semibold">
                      {totalCost.toFixed(2)} {form.watch('currency')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">الربح المتوقع:</span>
                    <div className="font-semibold text-green-600">
                      {totalProfit.toFixed(2)} {form.watch('currency')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الطلبات الإضافية */}
          <Card>
            <CardHeader>
              <CardTitle>الطلبات والخدمات الإضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="special_requests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>طلبات خاصة</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="كرسي متحرك، مساعدة خاصة، إلخ..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meal_preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تفضيلات الوجبات</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="حلال، نباتي، لا يحتوي على الجلوتين، إلخ..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="seat_preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تفضيلات المقاعد</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="نافذة، ممر، مقدمة الطائرة، إلخ..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline">
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={createBookingMutation.isPending}
            >
              {createBookingMutation.isPending ? "جاري الحفظ..." : "إنشاء حجز الطيران"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default FlightBookingFormEnhanced;
