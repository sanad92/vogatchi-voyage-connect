
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { BookingStatusHistory as BookingStatusHistoryType } from "@/types/hotelBooking";

interface BookingStatusHistoryProps {
  bookingId: string;
}

const BookingStatusHistory = ({ bookingId }: BookingStatusHistoryProps) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['booking-status-history', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_status_history')
        .select(`
          *,
          booking_status:status_id (
            id,
            name,
            name_ar,
            color
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BookingStatusHistoryType[];
    }
  });

  if (isLoading) {
    return <div className="text-center py-4">جاري تحميل تاريخ الحالات...</div>;
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تاريخ حالات الحجز</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">لا يوجد تاريخ للحالات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تاريخ حالات الحجز</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((record, index) => (
            <div 
              key={record.id} 
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
              }`}
            >
              <div 
                className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                style={{ backgroundColor: record.booking_status?.color || '#gray-500' }}
              />
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge 
                    style={{ 
                      backgroundColor: record.booking_status?.color || '#gray-500',
                      color: 'white'
                    }}
                  >
                    {record.booking_status?.name_ar || 'حالة غير معروفة'}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    {new Date(record.created_at).toLocaleString('ar', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                {record.notes && (
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                    {record.notes}
                  </p>
                )}
                
                {record.changed_by && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="h-3 w-3" />
                    <span>تم التغيير بواسطة: {record.changed_by}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingStatusHistory;
