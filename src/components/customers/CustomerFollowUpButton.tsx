import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { CheckCircle, MessageCircle, Clock } from "lucide-react";

interface CustomerFollowUpButtonProps {
  customerId: string;
  customerName: string;
  lastFollowUpDate?: string;
  onFollowUpCompleted?: () => void;
}

const CustomerFollowUpButton = ({ 
  customerId, 
  customerName, 
  lastFollowUpDate,
  onFollowUpCompleted 
}: CustomerFollowUpButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useOptimizedAuth();

  const handleFollowUp = async () => {
    if (!user?.id) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('🔄 بدء تسجيل متابعة جديدة للعميل:', customerId);

      // إنشاء متابعة جديدة مكتملة فوراً
      const { data: followUpData, error: followUpError } = await supabase
        .from('customer_follow_ups')
        .insert({
          customer_id: customerId,
          follow_up_type: 'manual_contact',
          scheduled_date: new Date().toISOString().split('T')[0],
          assigned_to: user.id,
          completed_at: new Date().toISOString(),
          status: 'completed',
          notes: notes || `تمت متابعة العميل ${customerName} بنجاح`,
          priority: 'normal',
          booking_id: null // إضافة booking_id كـ null للمتابعة العامة
        })
        .select()
        .single();

      if (followUpError) {
        console.error('❌ خطأ في إنشاء المتابعة:', followUpError);
        throw followUpError;
      }

      // تسجيل التواصل
      const { error: communicationError } = await supabase
        .from('customer_communications')
        .insert({
          customer_id: customerId,
          communication_type: 'call',
          direction: 'outgoing',
          status: 'completed',
          content: notes || `تمت متابعة العميل ${customerName}`,
          handled_by: user.id,
          completed_at: new Date().toISOString()
        });

      if (communicationError) {
        console.warn('⚠️ تحذير: لم يتم تسجيل التواصل:', communicationError);
      }

      console.log('✅ تم تسجيل المتابعة بنجاح:', followUpData);

      toast.success('تم تسجيل المتابعة بنجاح');
      setNotes("");
      setIsOpen(false);
      
      if (onFollowUpCompleted) {
        onFollowUpCompleted();
      }

    } catch (error) {
      console.error('❌ خطأ في تسجيل المتابعة:', error);
      toast.error('حدث خطأ في تسجيل المتابعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLastFollowUpInfo = () => {
    if (!lastFollowUpDate) {
      return {
        text: "لم تتم أي متابعة سابقة",
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
        color: "text-yellow-600"
      };
    }

    const daysDiff = Math.floor((new Date().getTime() - new Date(lastFollowUpDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      return {
        text: "تمت المتابعة اليوم",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        color: "text-green-600"
      };
    } else if (daysDiff === 1) {
      return {
        text: "تمت المتابعة أمس",
        icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
        color: "text-blue-600"
      };
    } else if (daysDiff <= 7) {
      return {
        text: `تمت المتابعة منذ ${daysDiff} أيام`,
        icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
        color: "text-blue-600"
      };
    } else {
      return {
        text: `تمت المتابعة منذ ${daysDiff} يوم`,
        icon: <Clock className="h-4 w-4 text-orange-500" />,
        color: "text-orange-600"
      };
    }
  };

  const followUpInfo = getLastFollowUpInfo();

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm ${followUpInfo.color}`}>
        {followUpInfo.icon}
        <span>{followUpInfo.text}</span>
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            className="w-full flex items-center gap-2" 
            variant="outline"
          >
            <MessageCircle className="h-4 w-4" />
            تسجيل متابعة جديدة
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل متابعة للعميل: {customerName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">ملاحظات المتابعة (اختياري)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب ملاحظات حول المتابعة..."
                rows={4}
              />
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleFollowUp}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'جاري التسجيل...' : 'تأكيد المتابعة'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerFollowUpButton;
