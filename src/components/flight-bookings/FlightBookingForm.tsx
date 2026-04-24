import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plane, Users, CreditCard, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NewFlightBooking, Airline, Airport, FlightClass } from "@/types/flightBooking";
import CustomerAgentSection from "./sections/CustomerAgentSection";
import FlightDetailsSection from "./sections/FlightDetailsSection";
import PassengerDetailsSection from "./sections/PassengerDetailsSection";
import FlightFinancialInfoSection from "./sections/FlightFinancialInfoSection";
import { useCurrentEmployeeEnhanced } from "@/hooks/useCurrentEmployeeEnhanced";

const flightBookingSchema = z.object({
  customer_name: z.string().min(1, "اسم العميل مطلوب"),
  booking_agent_name: z.string().min(1, "اسم وكيل الحجز مطلوب"),
  departure_airport_id: z.string().min(1, "مطار المغادرة مطلوب"),
  arrival_airport_id: z.string().min(1, "مطار الوصول مطلوب"),
  departure_date: z.date({ required_error: "تاريخ المغادرة مطلوب" }),
  departure_time: z.string().optional(),
  arrival_date: z.date({ required_error: "تاريخ الوصول مطلوب" }),
  arrival_time: z.string().optional(),
  flight_number: z.string().optional(),
  airline_id: z.string().min(1, "شركة الطيران مطلوبة"),
  flight_class_id: z.string().min(1, "درجة السفر مطلوبة"),
  number_of_passengers: z.number().min(1, "عدد المسافرين يجب أن يكون 1 على الأقل"),
  ticket_price_per_person: z.number().min(0, "سعر التذكرة مطلوب"),
  taxes_and_fees: z.number().min(0).optional(),
  supplier_cost: z.number().min(0, "تكلفة المورد مطلوبة"),
  supplier_name: z.string().min(1, "اسم المورد مطلوب"),
  currency: z.string().min(1, "العملة مطلوبة"),
  special_requests: z.string().optional(),
  meal_preferences: z.string().optional(),
  seat_preferences: z.string().optional(),
  is_round_trip: z.boolean().optional(),
  paid_amount: z.number().min(0).optional(),
  payment_method: z.string().optional(),
});

type FlightBookingFormData = z.infer<typeof flightBookingSchema>;

interface FlightBookingFormProps {
  onSuccess?: (booking: any) => void;
  initialData?: Partial<NewFlightBooking>;
}

const FlightBookingForm = ({ onSuccess, initialData }: FlightBookingFormProps) => {
  const [passengerDetails, setPassengerDetails] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const { currentEmployee, getBookingAgentId, getBookingAgentName } = useCurrentEmployeeEnhanced();
  const queryClient = useQueryClient();

  const form = useForm<FlightBookingFormData>({
    resolver: zodResolver(flightBookingSchema),
    defaultValues: {
      customer_name: initialData?.customer_name || "",
      booking_agent_name: getBookingAgentName(),
      number_of_passengers: initialData?.number_of_passengers || 1,
      ticket_price_per_person: initialData?.ticket_price_per_person || 0,
      taxes_and_fees: initialData?.taxes_and_fees || 0,
      supplier_cost: initialData?.supplier_cost || 0,
      supplier_name: initialData?.supplier_name || "",
      currency: initialData?.currency || "EGP",
      is_round_trip: initialData?.is_round_trip || false,
      paid_amount: initialData?.paid_amount || 0,
    },
  });

  // تحديث اسم الموظف عند تغيير الموظف الحالي
  useEffect(() => {
    if (currentEmployee) {
      form.setValue('booking_agent_name', getBookingAgentName());
    }
  }, [currentEmployee, form, getBookingAgentName]);

  // جلب البيانات الأساسية
  const { data: airlines = [] } = useQuery({
    queryKey: ['airlines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .range(0, 9999);
      if (error) throw error;
      return data as Airline[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .eq('is_active', true)
        .order('name')
        .range(0, 19999);
      if (error) throw error;
      return data as Airport[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: flightClasses = [] } = useQuery({
    queryKey: ['flight-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flight_classes')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as FlightClass[];
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

  const createBookingMutation = useMutation({
    mutationFn: async (data: FlightBookingFormData) => {
      const bookingData: any = {
        ...data,
        departure_date: format(data.departure_date, 'yyyy-MM-dd'),
        arrival_date: format(data.arrival_date, 'yyyy-MM-dd'),
        customer_id: selectedCustomer?.id || null,
        booking_agent_id: getBookingAgentId(), // استخدام الدالة الجديدة
        passenger_details: passengerDetails.length > 0 ? passengerDetails : null,
      };

      const { data: result, error } = await supabase
        .from('flight_bookings')
        .insert([bookingData])
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
    }
  };

  const addPassengerDetail = () => {
    setPassengerDetails([...passengerDetails, {
      name: '',
      passport: '',
      date_of_birth: '',
      nationality: ''
    }]);
  };

  const removePassengerDetail = (index: number) => {
    const updated = passengerDetails.filter((_, i) => i !== index);
    setPassengerDetails(updated);
  };

  const updatePassengerDetail = (index: number, field: string, value: string) => {
    const updated = [...passengerDetails];
    updated[index] = { ...updated[index], [field]: value };
    setPassengerDetails(updated);
  };

  const onSubmit = (data: FlightBookingFormData) => {
    createBookingMutation.mutate(data);
  };

  const numberOfPassengers = form.watch('number_of_passengers');

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* معلومات العميل */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                معلومات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CustomerAgentSection
                form={form}
                customers={customers}
                selectedCustomer={selectedCustomer}
                onCustomerSelect={handleCustomerSelect}
              />
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
              <FlightDetailsSection
                form={form}
                airports={airports}
                airlines={airlines}
                flightClasses={flightClasses}
              />
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="is_round_trip"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          رحلة ذهاب وعودة
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* تفاصيل المسافرين */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  تفاصيل المسافرين ({form.watch("number_of_passengers")} مسافر)
                </span>
                <Button type="button" onClick={addPassengerDetail} variant="outline" size="sm">
                  إضافة تفاصيل مسافر
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PassengerDetailsSection
                passengerDetails={passengerDetails}
                addPassengerDetail={addPassengerDetail}
                removePassengerDetail={removePassengerDetail}
                updatePassengerDetail={updatePassengerDetail}
                numberOfPassengers={form.watch("number_of_passengers")}
              />
            </CardContent>
          </Card>

          {/* خدمات إضافية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                الخدمات والطلبات الإضافية
              </CardTitle>
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

          {/* المعلومات المالية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                المعلومات المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FlightFinancialInfoSection
                form={form}
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

export default FlightBookingForm;
