
import Navbar from "@/components/Navbar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Users, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  base_price: number;
  location: string | null;
  supplier_id: string;
  suppliers: {
    name: string;
    commission_rate: number | null;
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
  const [newBooking, setNewBooking] = useState({
    customer_id: "",
    service_id: "",
    check_in_date: "",
    check_out_date: "",
    number_of_guests: 1,
    supplier_cost: 0,
    selling_price: 0,
    notes: ""
  });
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
          id, name, type, base_price, location, supplier_id,
          suppliers!inner(name, commission_rate)
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
          services!inner(id, name, type, base_price, location, supplier_id, suppliers!inner(name, commission_rate))
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
    mutationFn: async (booking: typeof newBooking) => {
      const nights = calculateNights(booking.check_in_date, booking.check_out_date);
      const bookingData = {
        ...booking,
        booking_reference: generateBookingReference(),
        number_of_nights: nights,
        supplier_cost: parseFloat(booking.supplier_cost.toString()),
        selling_price: parseFloat(booking.selling_price.toString())
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
      setNewBooking({
        customer_id: "",
        service_id: "",
        check_in_date: "",
        check_out_date: "",
        number_of_guests: 1,
        supplier_cost: 0,
        selling_price: 0,
        notes: ""
      });
      setShowForm(false);
      toast({
        title: "تم إنشاء الحجز بنجاح",
        description: "تم حفظ بيانات الحجز الجديد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء الحجز",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (status: string | null) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string | null) => {
    const labels = {
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      cancelled: "ملغي",
      completed: "مكتمل"
    };
    return labels[status as keyof typeof labels] || status || "غير محدد";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.customer_id || !newBooking.service_id || !newBooking.selling_price) {
      toast({
        title: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }
    addBookingMutation.mutate(newBooking);
  };

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
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>إنشاء حجز جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={newBooking.customer_id} onValueChange={(value) => setNewBooking({...newBooking, customer_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={newBooking.service_id} onValueChange={(value) => {
                  const service = services.find(s => s.id === value);
                  setNewBooking({
                    ...newBooking, 
                    service_id: value,
                    supplier_cost: service?.base_price || 0,
                    selling_price: service ? service.base_price * 1.2 : 0
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {service.base_price} جنيه
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={newBooking.check_in_date}
                  onChange={e => setNewBooking({...newBooking, check_in_date: e.target.value})}
                  placeholder="تاريخ الوصول"
                />

                <Input
                  type="date"
                  value={newBooking.check_out_date}
                  onChange={e => setNewBooking({...newBooking, check_out_date: e.target.value})}
                  placeholder="تاريخ المغادرة"
                />

                <Input
                  type="number"
                  value={newBooking.number_of_guests}
                  onChange={e => setNewBooking({...newBooking, number_of_guests: parseInt(e.target.value) || 1})}
                  placeholder="عدد الضيوف"
                  min="1"
                />

                <Input
                  type="number"
                  value={newBooking.supplier_cost}
                  onChange={e => setNewBooking({...newBooking, supplier_cost: parseFloat(e.target.value) || 0})}
                  placeholder="تكلفة المورد"
                  step="0.01"
                />

                <Input
                  type="number"
                  value={newBooking.selling_price}
                  onChange={e => setNewBooking({...newBooking, selling_price: parseFloat(e.target.value) || 0})}
                  placeholder="سعر البيع"
                  step="0.01"
                />

                <div className="md:col-span-2">
                  <Input
                    value={newBooking.notes}
                    onChange={e => setNewBooking({...newBooking, notes: e.target.value})}
                    placeholder="ملاحظات إضافية"
                  />
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={addBookingMutation.isPending}>
                    {addBookingMutation.isPending ? "جاري الحفظ..." : "إنشاء الحجز"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">جاري تحميل الحجوزات...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد حجوزات حتى الآن</div>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-bold text-lg">{booking.booking_reference}</p>
                      <p className="text-sm text-gray-600">{booking.customers.name}</p>
                      <p className="text-sm text-gray-600">{booking.customers.phone}</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">{booking.services.name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {booking.services.location}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {booking.number_of_guests} ضيف
                      </p>
                    </div>

                    <div>
                      {booking.check_in_date && (
                        <p className="text-sm">
                          <span className="font-medium">الوصول:</span> {booking.check_in_date}
                        </p>
                      )}
                      {booking.check_out_date && (
                        <p className="text-sm">
                          <span className="font-medium">المغادرة:</span> {booking.check_out_date}
                        </p>
                      )}
                      {booking.number_of_nights && (
                        <p className="text-sm flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {booking.number_of_nights} ليلة
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">التكلفة:</span> {booking.supplier_cost} جنيه</p>
                        <p><span className="font-medium">السعر:</span> {booking.selling_price} جنيه</p>
                        <p className={`font-bold ${booking.profit_margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>الربح:</span> {booking.profit_margin} جنيه
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Bookings;
