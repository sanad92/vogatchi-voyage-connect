import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

export const RESOLUTION_OPTIONS = [
  { value: 'done', label: 'تم بنجاح', variant: 'default' },
  { value: 'booked', label: 'تم الحجز', variant: 'default' },
  { value: 'follow_up', label: 'متابعة لاحقاً', variant: 'secondary' },
  { value: 'no_response', label: 'لا يوجد رد', variant: 'outline' },
  { value: 'cancelled', label: 'ملغي / غير مهتم', variant: 'outline' },
  { value: 'spam', label: 'سبام', variant: 'destructive' },
] as const;

export type ResolutionStatus = (typeof RESOLUTION_OPTIONS)[number]['value'];

export const ResolutionBadge: React.FC<{ status?: string | null; className?: string }> = ({ status, className }) => {
  const opt = RESOLUTION_OPTIONS.find(o => o.value === status);
  if (!opt) return null;
  return <Badge variant={opt.variant as any} className={className}>{opt.label}</Badge>;
};

interface Props {
  conversationId: string;
  organizationId?: string | null;
  isClosed?: boolean;
}

export const CloseConversationDialog: React.FC<Props> = ({ conversationId, organizationId, isClosed }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ResolutionStatus>('done');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async (reopen: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const patch = reopen
        ? { status: 'active', closed_at: null, resolved_at: null }
        : {
            status: 'closed', closed_at: now, resolved_at: now, closed_by: u.user?.id ?? null,
            resolution_status: status, resolution_notes: notes.trim() || null, resolved_by: u.user?.id ?? null,
          };
      let q = (supabase as any).from('whatsapp_conversations').update(patch).eq('id', conversationId);
      if (organizationId) q = q.eq('organization_id', organizationId);
      const { error } = await q;
      if (error) throw error;
      if (organizationId) {
        await (supabase as any).from('conversation_assignments_history').insert({
          conversation_id: conversationId, organization_id: organizationId,
          action: reopen ? 'status_changed' : 'closed', performed_by: u.user?.id,
          reason: reopen ? null : notes.trim() || null,
          metadata: reopen ? { status: 'active' } : { resolution_status: status },
        });
      }
    },
    onSuccess: (_d, reopen) => {
      toast.success(reopen ? 'تمت إعادة فتح المحادثة' : 'تم إنهاء المحادثة');
      setOpen(false); setNotes('');
      qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-conversation-detail'] });
      qc.invalidateQueries({ queryKey: ['conversation-history', conversationId] });
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر تحديث المحادثة'),
  });

  if (isClosed) {
    return (
      <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>
        إعادة فتح
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default"><CheckCircle2 className="h-4 w-4 me-1" />إنهاء المحادثة</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>إنهاء المحادثة</DialogTitle>
          <DialogDescription>اختر نتيجة المحادثة؛ ستظهر لكل الفريق في قائمة المحادثات.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {RESOLUTION_OPTIONS.map(o => (
              <Button key={o.value} type="button" variant={status === o.value ? 'default' : 'outline'}
                onClick={() => setStatus(o.value)} aria-pressed={status === o.value}>
                {o.label}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolution-notes">ملاحظات للفريق (اختياري)</Label>
            <Textarea id="resolution-notes" value={notes} maxLength={1000}
              onChange={e => setNotes(e.target.value)} placeholder="مثال: العميل سيعود بعد تحديد موعد السفر" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate(false)}>تأكيد الإنهاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
