import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useCompleteHandover, useHandovers } from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { HANDOVER_CHECKLISTS, HANDOVER_LABELS, type SopHandoverType } from '@/lib/sop';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
  type: SopHandoverType;
}

/** Hard gate: ownership only moves when every checklist item is ticked. */
export const HandoverDialog = ({ open, onClose, leadId, type }: Props) => {
  const items = HANDOVER_CHECKLISTS[type];
  const { data: handovers } = useHandovers(leadId);
  const { members } = useOrgMembers();
  const complete = useCompleteHandover();

  const existing = useMemo(
    () => (handovers || []).find((h) => h.handover_type === type),
    [handovers, type],
  );

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [toUser, setToUser] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setChecklist((existing?.checklist as Record<string, boolean>) || {});
      setToUser(existing?.to_user_id || '');
      setNotes(existing?.notes || '');
    }
  }, [open, existing]);

  const done = items.filter((i) => checklist[i.key]).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{HANDOVER_LABELS[type]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>اكتمال قائمة التسليم</span>
              <span>{done}/{items.length}</span>
            </div>
            <Progress value={pct} />
          </div>

          <div className="space-y-2">
            {items.map((i) => (
              <label key={i.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={!!checklist[i.key]}
                  onCheckedChange={(v) => setChecklist((c) => ({ ...c, [i.key]: !!v }))}
                />
                <span>{i.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">المستلم</Label>
            <Select value={toUser} onValueChange={setToUser}>
              <SelectTrigger><SelectValue placeholder="اختر المستلم" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">ملاحظات التسليم</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
          <Button
            disabled={complete.isPending}
            onClick={() =>
              complete.mutate(
                { leadId, type, checklist, toUser: toUser || null, notes },
                { onSuccess: (r: any) => { if (r?.allowed) onClose(); } },
              )
            }
          >
            حفظ التسليم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HandoverDialog;
