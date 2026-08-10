import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCheck, CheckCircle2, Send, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompleteHandover, useHandovers, useSopDepartmentMembers } from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import {
  HANDOVER_CHECKLISTS,
  HANDOVER_FLOW,
  HANDOVER_LABELS,
  DEPARTMENT_LABELS,
  type SopHandoverType,
} from '@/lib/sop';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
  type: SopHandoverType;
}

const STEPS = ['لمين؟', 'جاهزية الملف', 'إرسال'];

/** Guided 3-step handover: pick receiver → confirm readiness → send. */
export const HandoverDialog = ({ open, onClose, leadId, type }: Props) => {
  const items = HANDOVER_CHECKLISTS[type];
  const flow = HANDOVER_FLOW[type];
  const { data: handovers } = useHandovers(leadId);
  const { members } = useOrgMembers();
  const { data: targetMembers } = useSopDepartmentMembers(flow.to);
  const complete = useCompleteHandover();

  const existing = useMemo(
    () => (handovers || []).find((h) => h.handover_type === type),
    [handovers, type],
  );

  const [step, setStep] = useState(0);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [toUser, setToUser] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setStep(0);
      setChecklist((existing?.checklist as Record<string, boolean>) || {});
      setToUser(existing?.to_user_id || '');
      setNotes(existing?.notes || '');
    }
  }, [open, existing]);

  // Suggest an available member of the receiving department.
  useEffect(() => {
    if (open && !toUser && targetMembers?.length) {
      const available = targetMembers.find((m: any) => m.is_available) || targetMembers[0];
      if (available?.user_id) setToUser(available.user_id);
    }
  }, [open, toUser, targetMembers]);

  const nameOf = (id: string) =>
    members.find((m) => m.user_id === id)?.profile?.full_name ||
    members.find((m) => m.user_id === id)?.profile?.email ||
    id.slice(0, 8);

  const done = items.filter((i) => checklist[i.key]).length;
  const pct = Math.round((done / items.length) * 100);
  const allReady = done === items.length;
  const missing = items.filter((i) => !checklist[i.key]);

  const canNext = step === 0 ? !!toUser : step === 1 ? allReady : true;
  const blockReason =
    step === 0 && !toUser
      ? 'اختر الموظف المستلم أولًا'
      : step === 1 && !allReady
        ? `باقي ${missing.length} بند لازم تتأكد منه`
        : '';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base">{HANDOVER_LABELS[type]}</DialogTitle>
        </DialogHeader>

        {/* step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'h-6 w-6 shrink-0 rounded-full text-xs flex items-center justify-center border',
                  i < step && 'bg-primary text-primary-foreground border-primary',
                  i === step && 'border-primary text-primary font-semibold',
                  i > step && 'text-muted-foreground',
                )}
              >
                {i < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('text-xs', i === step ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {/* step 1 — receiver */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 flex items-center justify-center gap-3 text-sm">
              <span className="font-medium">{DEPARTMENT_LABELS[flow.from]}</span>
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-primary">{DEPARTMENT_LABELS[flow.to]}</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">مين هيستلم الملف؟</Label>
              <Select value={toUser} onValueChange={setToUser}>
                <SelectTrigger><SelectValue placeholder="اختر الموظف المستلم" /></SelectTrigger>
                <SelectContent>
                  {(targetMembers?.length ? targetMembers.map((m: any) => m.user_id) : members.map((m) => m.user_id))
                    .filter((id: string, i: number, arr: string[]) => arr.indexOf(id) === i)
                    .map((id: string) => (
                      <SelectItem key={id} value={id}>{nameOf(id)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                بنقترح تلقائيًا موظف متاح من {DEPARTMENT_LABELS[flow.to]}، وتقدر تغيّره.
              </p>
            </div>
          </div>
        )}

        {/* step 2 — readiness */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>جاهزية الملف</span>
                <span>{done}/{items.length}</span>
              </div>
              <Progress value={pct} />
            </div>

            <Button
              type="button" size="sm" variant="outline" className="w-full"
              onClick={() =>
                setChecklist(Object.fromEntries(items.map((i) => [i.key, true])))
              }
            >
              <CheckCheck className="h-3.5 w-3.5 ml-1" /> تحديد الكل جاهز
            </Button>

            <div className="space-y-1.5">
              {items.map((i) => {
                const checked = !!checklist[i.key];
                return (
                  <label
                    key={i.key}
                    className={cn(
                      'flex items-center gap-2 text-sm cursor-pointer rounded-md border p-2 transition-colors',
                      checked ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30' : 'border-destructive/30',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => setChecklist((c) => ({ ...c, [i.key]: !!v }))}
                    />
                    <span>{i.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* step 3 — send */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span>المستلم: <strong>{toUser ? nameOf(toUser) : '—'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>كل بنود الجاهزية ({items.length}) مؤكدة</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ملاحظة للمستلم (اختياري)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                placeholder="أي معلومة مهمة يحتاجها الزميل" />
            </div>
          </div>
        )}

        {blockReason && <p className="text-xs text-destructive">{blockReason}</p>}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}>
            {step === 0 ? 'إلغاء' : (<><ArrowRight className="h-3.5 w-3.5 ml-1" /> رجوع</>)}
          </Button>
          {step < 2 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              التالي <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            </Button>
          ) : (
            <Button
              disabled={complete.isPending}
              onClick={() =>
                complete.mutate(
                  { leadId, type, checklist, toUser: toUser || null, notes },
                  { onSuccess: (r: any) => { if (r?.allowed !== false) onClose(); } },
                )
              }
            >
              <Send className="h-3.5 w-3.5 ml-1" /> تسليم الآن
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HandoverDialog;
