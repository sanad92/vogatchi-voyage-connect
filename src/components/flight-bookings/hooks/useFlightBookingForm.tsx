
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrentEmployeeEnhanced } from "@/hooks/useCurrentEmployeeEnhanced";
import { Customer } from "@/types/customer";

const flightBookingSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, "اسم العميل مطلوب"),
  trip_type: z.enum(['one-way', 'round-trip', 'multi-city']),
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
  supplier_id: z.string().min(1, "المورد مطلوب"),
  supplier_cost: z.number().min(0, "تكلفة المورد مطلوبة"),
  ticket_price_per_person: z.number().min(0, "سعر التذكرة مطلوب"),
  currency: z.string().min(1, "العملة مطلوبة"),
  paid_amount: z.number().min(0).optional(),
  payment_method: z.string().optional(),
  special_requests: z.string().optional(),
  meal_preferences: z.string().optional(),
  seat_preferences: z.string().optional(),
});

export type FlightBookingFormData = z.infer<typeof flightBookingSchema>;

interface UseFlightBookingFormProps {
  onSuccess?: (booking: any) => void;
  initialData?: Partial<FlightBookingFormData>;
}

export const useFlightBookingForm = ({ onSuccess, initialData }: UseFlightBookingFormProps) => {
  const [passengerDetails, setPassengerDetails] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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
      supplier_cost: initialData?.supplier_cost || 0,
      currency: initialData?.currency || "EGP",
      paid_amount: initialData?.paid_amount || 0,
    },
  });

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

  const ticketPrice = form.watch('ticket_price_per_person');
  const numberOfPassengers = form.watch('number_of_passengers');
  const supplierCost = form.watch('supplier_cost');

  const totalCost = (ticketPrice * numberOfPassengers);
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

  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      form.setValue('customer_name', customer.full_name || customer.name);
      form.setValue('customer_id', customer.id);
    } else {
      form.setValue('customer_name', '');
      form.setValue('customer_id', '');
    }
  };

  const handleSupplierSelect = (supplierId: string, supplierName: string) => {
    setSelectedSupplier({ id: supplierId, name: supplierName });
    form.setValue('supplier_id', supplierId);
  };

  const onSubmit = (data: FlightBookingFormData) => {
    createBookingMutation.mutate(data);
  };

  return {
    form,
    flightClasses,
    passengerDetails,
    setPassengerDetails,
    selectedCustomer,
    selectedSupplier,
    currentEmployee,
    totalCost,
    totalProfit,
    createBookingMutation,
    handleCustomerSelect,
    handleSupplierSelect,
    onSubmit,
  };
};
