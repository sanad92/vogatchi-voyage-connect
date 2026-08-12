import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RotateCcw, UserX } from 'lucide-react';
import { useDisqualifyLead, useMoveLeadBack } from '@/hooks/useSop';
import { LEAD_STAGE_LABELS, type SopLeadStage } from '@/lib/sop';

/** Ordered forward path — anything before the current stage is a valid backward target. */
const STAGE_ORDER: SopLeadStage[] = [
  'new', 'assigned', 'qualified', 'pricing_requested', 'quoted', 'follow_up',
  'accepted_pending_recheck', 'rechecked', 'payment_pending', 'won',
];

export const DISQUALIFY_REASONS = [
  'الميزانية غير واقعية',
  'خارج نطاق خدماتنا',
  'بيانات ناقصة ولا يمكن التواصل',
  'العميل غير جاد',
  'مكرر / تم التعامل معه',
  'سبب آخر',
];

interface Props {
  leadId: string;
  stage: SopLeadStage;
}

/** Backward moves and disqualification — both require an explicit reason. */
export const SopStageActions = ({ leadId, stage }: Props) => {
  const moveBack = useMoveLeadBack();
  const disqualify = useDisqualifyLead();

  const [backOpen, setBackOpen] = useState(false);
  const [backTo, setBackTo] = useState<SopLeadStage | ''>('');
  const [backReason, setBackReason] = useState('');

  const [dqOpen, setDqOpen] = useState(false);
  const [dqReason, setDqReason] = useState(DISQUALIFY_REASONS[0]);
  const [dqNote, setDqNote] = useState('');

  const currentIndex = STAGE_ORDER.indexOf(stage);
  const backTargets = currentIndex > 0 ? STAGE_ORDER.slice(0, currentIndex) : [];
  const closed = stage === 'lost' || stage === 'cancelled' || stage === 'won';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {backTargets.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setBackOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5 ml-1" /> إرجاع لمرحلة سابقة
          </Button>
        )}
        {!closed && (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDqOpen(true)}>
            <UserX className="h-3.5 w-3.5 ml-1" /> غير مؤهل
          </Button>
        )}
      </div>

      <Dialog open={backOpen} onOpenChange={setBackOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إرجاع الملف لمرحلة سابقة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>المرحلة المستهدفة</Label>
              <Select value={backTo} onValueChange={(v) => setBackTo(v as SopLeadStage)}>
                <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                <SelectContent>
                  {backTargets.map((s) => (
                    <SelectItem key={s} value={s}>{LEAD_STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>سبب الإرجاع *</Label>
              <Textarea
                value={backReason}
                onChange={(e) => setBackReason(e.target.value)}
                placeholder="مثال: العميل غيّر التواريخ ومحتاج تسعير جديد"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              كل التسعيرات والعروض السابقة تفضل محفوظة كتاريخ للملف.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={!backTo || !backReason.trim() || moveBack.isPending}
              onClick={() => {
                moveBack.mutate(
                  { leadId, to: backTo as SopLeadStage, reason: backReason.trim() },
                  { onSuccess: () => { setBackOpen(false); setBackReason(''); setBackTo(''); } },
                );
              }}
            >
              تأكيد الإرجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dqOpen} onOpenChange={setDqOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعليم العميل كغير مؤهل</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>السبب *</Label>
              <Select value={dqReason} onValueChange={setDqReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISQUALIFY_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>ملاحظة (اختياري)</Label>
              <Textarea value={dqNote} onChange={(e) => setDqNote(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              الملف هيتقفل ويظهر في قسم «غير مؤهل» — وتقدر تعيد فتحه في أي وقت.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={disqualify.isPending}
              onClick={() =>
                disqualify.mutate(
                  { leadId, reason: dqReason, note: dqNote.trim() || undefined },
                  { onSuccess: () => { setDqOpen(false); setDqNote(''); } },
                )
              }
            >
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SopStageActions;
