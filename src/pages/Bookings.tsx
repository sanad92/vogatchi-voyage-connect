import Navbar from "@/components/Navbar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BookingForm from "@/components/bookings/BookingForm";
import BookingCard from "@/components/bookings/BookingCard";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

type Service = {
  id: string;
  name: string;
  type: string;
  location: string | null;
  supplier_id: string;
  service_category: string | null;
  suppliers: {
    name: string;
  };
};

type Booking = {
  id: string;
  booking_reference: string;
  check_in_date: string | null;
  check_out_date: string | null;
  number_of_nights: number | null;
  number_of_guests: number | null;
  supplier_cost: number;
  selling_price: number;
  profit_margin: number;
  status: string | null;
  customers: Customer;
  services: Service;
};

const Bookings = () => {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .order('name');
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          id, name, type, location, supplier_id, service_category,
          suppliers!inner(name)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_reference, check_in_date, check_out_date,
          number_of_nights, number_of_guests, supplier_cost,
          selling_price, profit_margin, status,
          customers!inner(id, name, phone, email),
          services!inner(id, name, type, location, supplier_id, service_category, suppliers!inner(name))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Booking[];
    }
  });

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const generateBookingReference = () => {
    return 'BK' + Date.now().toString().slice(-8);
  };

  const addBookingMutation = useMutation({
    mutationFn: async (booking: any) => {
      const nights = calculateNights(booking.check_in_date, booking.check_out_date);
      const bookingData = {
        ...booking,
        booking_reference: generateBookingReference(),
        number_of_nights: nights,
        supplier_cost: parseFloat(booking.supplier_cost.toString()),
        selling_price: parseFloat(booking.selling_price.toString()),
        profit_margin: parseFloat(booking.selling_price.toString()) - parseFloat(booking.supplier_cost.toString())
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setShowForm(false);
      toast({
        title: "تم إنشاء الحجز بنجاح",
        description: "تم حفظ بيانات الحجز الجديد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الحجز",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <Navbar />
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <Calendar /> إدارة الحجوزات
          </h2>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            حجز جديد
          </Button>
        </div>

        {showForm && (
          <div className="mb-8">
            <BookingForm
              customers={customers}
              services={services}
              onSubmit={(booking) => addBookingMutation.mutate(booking)}
              onCancel={() => setShowForm(false)}
              isLoading={addBookingMutation.isPending}
            />
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">جاري تحميل الحجوزات...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد حجوزات حتى الآن</div>
          ) : (
            bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Bookings;
