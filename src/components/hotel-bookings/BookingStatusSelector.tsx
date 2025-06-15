
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
import BookingStatusBadge from "./BookingStatusBadge";

interface BookingStatusSelectorProps {
  bookingId: string;
  currentStatus?: BookingStatus;
  onStatusUpdate?: () => void;
}

const BookingStatusSelector = ({ bookingId, currentStatus, onStatusUpdate }: BookingStatusSelectorProps) => {
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
      const { error } = await supabase
        .rpc('update_booking_status', {
          p_booking_id: bookingId,
          p_status_id: statusId,
          p_notes: notes.trim() || null
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث حالة الحجز بنجاح');
      queryClient.invalidateQueries({ queryKey: ['hotel-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-status-history', bookingId] });
      setOpen(false);
      setSelectedStatusId("");
      setNotes("");
      onStatusUpdate?.();
    },
    onError: (error) => {
      console.error('Error updating booking status:', error);
      toast.error('خطأ في تحديث حالة الحجز');
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

  return (
    <div className="flex items-center gap-2">
      <BookingStatusBadge status={currentStatus} />
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            تغيير الحالة
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير حالة الحجز</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>الحالة الحالية</Label>
              <div className="mt-1">
                <BookingStatusBadge status={currentStatus} />
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

export default BookingStatusSelector;
