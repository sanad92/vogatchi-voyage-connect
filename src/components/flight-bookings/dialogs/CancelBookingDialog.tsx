
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CancelBookingDialogProps {
  open: boolean;
  bookingId: string;
  onClose: () => void;
}

const CancelBookingDialog: React.FC<CancelBookingDialogProps> = ({ open, bookingId, onClose }) => {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleCancel = async () => {
    setLoading(true);
    try {
      // احصل على id الحالة "ملغي" (cancelled)
      const { data: statuses } = await supabase
        .from("booking_statuses")
        .select("id")
        .or("name.eq.cancelled,name_ar.eq.ملغي");
      const cancelledStatus = statuses?.[0];
      if (!cancelledStatus) throw new Error("لم يتم العثور على حالة الإلغاء");
      await supabase.rpc("update_booking_status", {
        p_booking_id: bookingId,
        p_status_id: cancelledStatus.id,
        p_notes: notes || "إلغاء عن طريق النظام"
      });
      toast.success("تم إلغاء الحجز بنجاح");
      queryClient.invalidateQueries();
      onClose();
    } catch (err: any) {
      toast.error("خطأ في إلغاء الحجز: " + err.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تأكيد إلغاء الحجز</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="سبب الإلغاء (اختياري)..."
            disabled={loading}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>إلغاء العملية</Button>
            <Button onClick={handleCancel} disabled={loading}>
              {loading ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelBookingDialog;
