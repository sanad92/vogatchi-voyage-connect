
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import HotelBookingForm from "@/components/hotel-bookings/HotelBookingForm";
import HotelBookingsList from "@/components/hotel-bookings/HotelBookingsList";
import { HotelBooking } from "@/types/hotelBooking";

const HotelBookings = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<HotelBooking | null>(null);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['hotel-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as HotelBooking[];
    }
  });

  const handleNewBooking = () => {
    setEditingBooking(null);
    setShowForm(true);
  };

  const handleEditBooking = (booking: HotelBooking) => {
    setEditingBooking(booking);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBooking(null);
    refetch();
  };

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل الحجوزات...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">حجوزات الفنادق - Vogatchi Trips</h1>
        <Button onClick={handleNewBooking} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          حجز جديد
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingBooking ? 'تعديل الحجز' : 'حجز فندق جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HotelBookingForm 
              booking={editingBooking}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <HotelBookingsList 
          bookings={bookings || []}
          onEdit={handleEditBooking}
          onRefresh={refetch}
        />
      )}
    </div>
  );
};

export default HotelBookings;
