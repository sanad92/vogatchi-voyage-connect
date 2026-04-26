
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { BookingStatus } from "@/types/common";
import UnifiedBookingStatusBadge from "./UnifiedBookingStatusBadge";

interface UnifiedBookingStatusSelectorProps {
  bookingId: string;
  bookingType: 'hotel' | 'flight' | 'transport' | 'car_rental';
  currentStatus?: BookingStatus;
  onStatusUpdate?: () => void;
}

const UnifiedBookingStatusSelector = ({ 
  bookingId, 
  bookingType, 
  currentStatus, 
  onStatusUpdate 
}: UnifiedBookingStatusSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string>("");
  const [notes, setNotes] = useState("");
  
  const queryClient = useQueryClient();

  const { data: statuses = [] } = useQuery({
    queryKey: ['booking-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_statuses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as BookingStatus[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ statusId, notes }: { statusId: string; notes: string }) => {
      // تحديد الجدول المناسب حسب نوع الحجز
      let tableName: 'hotel_bookings' | 'flight_bookings' | 'transport_bookings' | 'car_rentals';
      
      switch (bookingType) {
        case 'hotel':
          tableName = 'hotel_bookings';
          break;
        case 'flight':
          tableName = 'flight_bookings';
          break;
        case 'transport':
          tableName = 'transport_bookings';
          break;
        case 'car_rental':
          tableName = 'car_rentals';
          break;
        default:
          throw new Error('Invalid booking type');
      }
      
      // جلب organization_id للحجز قبل التحديث (لازم لسجل التاريخ)
      const { data: bookingRow, error: fetchErr } = await supabase
        .from(tableName)
        .select('organization_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const orgId = (bookingRow as any)?.organization_id;

      // تحديث حالة الحجز
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ 
          status_id: statusId,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (updateError) throw updateError;

      // إضافة سجل في تاريخ تغيير الحالات (مع organization_id لاجتياز RLS)
      const { data: userData } = await supabase.auth.getUser();
      const { error: historyError } = await supabase
        .from('booking_status_history')
        .insert({
          booking_id: bookingId,
          status_id: statusId,
          changed_by: userData.user?.id,
          notes: notes.trim() || null,
          organization_id: orgId,
        } as any);
      
      if (historyError) {
        // لا نُفشل العملية إن فشل السجل التاريخي فقط
        console.warn('Failed to write status history:', historyError);
      }
    },
    onSuccess: () => {
      toast.success('تم تحديث حالة الحجز بنجاح');
      
      // تحديث cache للحجوزات حسب النوع
      const queryKeys = {
        hotel: ['hotel-bookings'],
        flight: ['flight-bookings'], 
        transport: ['transport-bookings'],
        car_rental: ['car-rentals']
      };
      
      queryClient.invalidateQueries({ queryKey: queryKeys[bookingType] });
      queryClient.invalidateQueries({ queryKey: ['booking-status-history', bookingId] });
      
      setOpen(false);
      setSelectedStatusId("");
      setNotes("");
      onStatusUpdate?.();
    },
    onError: (error: any) => {
      console.error('Error updating booking status:', error);
      const msg = error?.message || error?.details || '';
      if (error?.code === '42501' || /row-level security/i.test(msg)) {
        toast.error('ليس لديك صلاحية تغيير حالة هذا الحجز');
      } else {
        toast.error(msg || 'خطأ في تحديث حالة الحجز');
      }
    }
  });

  const handleSubmit = () => {
    if (!selectedStatusId) {
      toast.error('يرجى اختيار حالة جديدة');
      return;
    }

    updateStatusMutation.mutate({
      statusId: selectedStatusId,
      notes
    });
  };

  const getBookingTypeLabel = () => {
    const labels = {
      hotel: 'الفندق',
      flight: 'الطيران', 
      transport: 'النقل',
      car_rental: 'تأجير السيارة'
    };
    return labels[bookingType];
  };

  return (
    <div className="flex items-center gap-2">
      <UnifiedBookingStatusBadge status={currentStatus} />
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            تغيير الحالة
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير حالة حجز {getBookingTypeLabel()}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>الحالة الحالية</Label>
              <div className="mt-1">
                <UnifiedBookingStatusBadge status={currentStatus} />
              </div>
            </div>

            <div>
              <Label htmlFor="status">الحالة الجديدة *</Label>
              <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة جديدة" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name_ar}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات حول تغيير الحالة..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedStatusId || updateStatusMutation.isPending}
                className="flex-1"
              >
                {updateStatusMutation.isPending ? 'جاري التحديث...' : 'تحديث الحالة'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedBookingStatusSelector;
