
import React, { useState } from "react";
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
  const queryClient = useQueryClient();

  const form = useForm<FlightBookingFormData>({
    resolver: zodResolver(flightBookingSchema),
    defaultValues: {
      customer_name: initialData?.customer_name || "",
      booking_agent_name: initialData?.booking_agent_name || "",
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

  // جلب البيانات الأساسية
  const { data: airlines = [] } = useQuery({
    queryKey: ['airlines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Airline[];
    }
  });

  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Airport[];
    }
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_select">اختيار عميل موجود (اختياري)</Label>
                  <Select onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عميل..." />
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

                <FormField
                  control={form.control}
                  name="booking_agent_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وكيل الحجز</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="أدخل اسم وكيل الحجز" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure_airport_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مطار المغادرة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر مطار المغادرة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {airports.map((airport) => (
                            <SelectItem key={airport.id} value={airport.id}>
                              {airport.name} ({airport.iata_code}) - {airport.city}
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
                  name="arrival_airport_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مطار الوصول</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر مطار الوصول" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {airports.map((airport) => (
                            <SelectItem key={airport.id} value={airport.id}>
                              {airport.name} ({airport.iata_code}) - {airport.city}
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
                            disabled={(date) =>
                              date < new Date()
                            }
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
                  name="departure_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وقت المغادرة (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
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
                            disabled={(date) =>
                              date < new Date()
                            }
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
                  name="arrival_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وقت الوصول (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="airline_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شركة الطيران</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر شركة الطيران" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {airlines.map((airline) => (
                            <SelectItem key={airline.id} value={airline.id}>
                              {airline.name} {airline.iata_code && `(${airline.iata_code})`}
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
              </div>

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
                  تفاصيل المسافرين ({numberOfPassengers} مسافر)
                </span>
                <Button type="button" onClick={addPassengerDetail} variant="outline" size="sm">
                  إضافة تفاصيل مسافر
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {passengerDetails.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  لم يتم إضافة تفاصيل المسافرين بعد (اختياري)
                </p>
              ) : (
                <div className="space-y-4">
                  {passengerDetails.map((passenger, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">المسافر {index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm"
                          onClick={() => removePassengerDetail(index)}
                        >
                          حذف
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>الاسم (كما في جواز السفر)</Label>
                          <Input
                            value={passenger.name}
                            onChange={(e) => updatePassengerDetail(index, 'name', e.target.value)}
                            placeholder="الاسم الكامل"
                          />
                        </div>
                        <div>
                          <Label>رقم جواز السفر</Label>
                          <Input
                            value={passenger.passport}
                            onChange={(e) => updatePassengerDetail(index, 'passport', e.target.value)}
                            placeholder="رقم جواز السفر"
                          />
                        </div>
                        <div>
                          <Label>تاريخ الميلاد</Label>
                          <Input
                            type="date"
                            value={passenger.date_of_birth}
                            onChange={(e) => updatePassengerDetail(index, 'date_of_birth', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>الجنسية</Label>
                          <Input
                            value={passenger.nationality}
                            onChange={(e) => updatePassengerDetail(index, 'nationality', e.target.value)}
                            placeholder="الجنسية"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        </SelectContent>
                      </Select>
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
                  name="supplier_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المورد</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="اسم شركة الطيران أو الوكيل" />
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

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>طريقة الدفع</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر طريقة الدفع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="card">بطاقة ائتمان</SelectItem>
                          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                          <SelectItem value="installment">تقسيط</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
