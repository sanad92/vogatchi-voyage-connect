import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Check, History, MessageCirclePlus, PhoneCall, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAddLeadActivity,
  useCancelLeadActivity,
  useCompleteLeadActivity,
  useLeadActivities,
  type SopLead,
  type SopLeadActivity,
} from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { formatLeadDateTime, LEAD_ACTIVITY_LABELS } from '@/lib/leadPipeline';

interface Props {
  lead: SopLead;
  canManage: boolean;
}

const defaultDueAt = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const activityTypes: SopLeadActivity['activity_type'][] = [
  'call', 'whatsapp', 'email', 'meeting', 'task', 'note',
];

export const LeadActivityPanel = ({ lead, canManage }: Props) => {
  const { data: activities = [], isLoading } = useLeadActivities(lead.id);
  const { members } = useOrgMembers();
  const addActivity = useAddLeadActivity();
  const completeActivity = useCompleteLeadActivity();
  const cancelActivity = useCancelLeadActivity();

  const [addOpen, setAddOpen] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<SopLeadActivity | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SopLeadActivity | null>(null);
  const [mode, setMode] = useState<'planned' | 'completed'>('planned');
  const [activityType, setActivityType] = useState<SopLeadActivity['activity_type']>('call');
  const [dueAt, setDueAt] = useState(defaultDueAt);
  const [assignedTo, setAssignedTo] = useState(lead.current_owner_id || 'self');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');

  const planned = useMemo(
    () => activities
      .filter((activity) => activity.status === 'planned')
      .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime()),
    [activities],
  );
  const history = activities.filter((activity) => activity.status !== 'planned').slice(0, 8);

  const memberName = (userId: string | null) => {
    if (!userId) return 'غير محدد';
    return members.find((member) => member.user_id === userId)?.profile?.full_name || userId.slice(0, 8);
  };

  const resetAddForm = () => {
    setMode('planned');
    setActivityType('call');
    setDueAt(defaultDueAt());
    setAssignedTo(lead.current_owner_id || 'self');
    setNotes('');
    setOutcome('');
  };

  const submitActivity = () => {
    let dueIso: string | null = null;
    if (mode === 'planned') {
      const parsed = new Date(dueAt);
      if (!dueAt || Number.isNaN(parsed.getTime())) {
        toast.error('اختر موعد متابعة صالح');
        return;
      }
      dueIso = parsed.toISOString();
    }

    addActivity.mutate({
      leadId: lead.id,
      activityType,
      dueAt: dueIso,
      notes,
      assignedTo: assignedTo === 'self' ? null : assignedTo,
      outcome: mode === 'completed' ? outcome : undefined,
      completed: mode === 'completed',
    }, {
      onSuccess: (result) => {
        if (result?.allowed === false) return;
        setAddOpen(false);
        resetAddForm();
      },
    });
  };

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> المتابعات والأنشطة
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <MessageCirclePlus className="h-3.5 w-3.5 ml-1" /> إضافة
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lead.next_follow_up_at && (
          <div className="rounded-md border bg-muted/40 p-2 text-xs">
            <span className="text-muted-foreground">المتابعة التالية: </span>
            <span className="font-medium">{formatLeadDateTime(lead.next_follow_up_at)}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-medium">المتابعات المفتوحة ({planned.length})</div>
          {planned.map((activity) => (
            <div key={activity.id} className="rounded-md border p-2 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{LEAD_ACTIVITY_LABELS[activity.activity_type]}</div>
                  <div className="text-muted-foreground">{formatLeadDateTime(activity.due_at)}</div>
                </div>
                <Badge variant={activity.due_at && new Date(activity.due_at) < new Date() ? 'destructive' : 'secondary'}>
                  {memberName(activity.assigned_to)}
                </Badge>
              </div>
              {activity.notes && <p className="text-muted-foreground whitespace-pre-wrap">{activity.notes}</p>}
              {canManage && (
                <div className="flex gap-2">
                  <Button size="sm" className="h-7" onClick={() => setCompletionTarget(activity)}>
                    <Check className="h-3.5 w-3.5 ml-1" /> إتمام
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setCancelTarget(activity)}>
                    <X className="h-3.5 w-3.5 ml-1" /> إلغاء
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!planned.length && !isLoading && (
            <p className="text-xs text-muted-foreground">لا توجد متابعة قادمة.</p>
          )}
        </div>

        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium flex items-center gap-1">
              <History className="h-3.5 w-3.5" /> آخر الأنشطة
            </div>
            {history.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-2 border-b pb-2 text-xs last:border-0">
                <div>
                  <div>{LEAD_ACTIVITY_LABELS[activity.activity_type]} — {activity.status === 'completed' ? 'مكتمل' : 'ملغي'}</div>
                  <div className="text-muted-foreground">{activity.outcome || activity.notes || 'بدون نتيجة مسجلة'}</div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatLeadDateTime(activity.completed_at || activity.updated_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة متابعة أو تسجيل تواصل</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={mode === 'planned' ? 'default' : 'outline'} onClick={() => setMode('planned')}>
                <CalendarClock className="h-4 w-4 ml-1" /> متابعة قادمة
              </Button>
              <Button type="button" variant={mode === 'completed' ? 'default' : 'outline'} onClick={() => setMode('completed')}>
                <PhoneCall className="h-4 w-4 ml-1" /> تواصل تم الآن
              </Button>
            </div>

            <div className="space-y-1">
              <Label>نوع النشاط</Label>
              <Select value={activityType} onValueChange={(value) => setActivityType(value as SopLeadActivity['activity_type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => <SelectItem key={type} value={type}>{LEAD_ACTIVITY_LABELS[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {mode === 'planned' && (
              <>
                <div className="space-y-1">
                  <Label>موعد المتابعة *</Label>
                  <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>المسؤول</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">المسؤول الحالي / أنا</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profile?.full_name || member.profile?.email || member.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {mode === 'completed' && (
              <div className="space-y-1">
                <Label>نتيجة التواصل</Label>
                <Input value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="مثال: طلب عرض بديل أو لم يرد" />
              </div>
            )}

            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitActivity} disabled={addActivity.isPending}>
              حفظ النشاط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!completionTarget} onOpenChange={(open) => { if (!open) { setCompletionTarget(null); setOutcome(''); setNotes(''); } }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إتمام المتابعة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>النتيجة</Label>
              <Input value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="مثال: العميل مهتم وينتظر السعر" />
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={completeActivity.isPending}
              onClick={() => completionTarget && completeActivity.mutate({
                activityId: completionTarget.id,
                outcome,
                notes,
              }, {
                onSuccess: (result) => {
                  if (result?.allowed === false) return;
                  setCompletionTarget(null);
                  setOutcome('');
                  setNotes('');
                },
              })}
            >
              تأكيد الإتمام
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء المتابعة؟</AlertDialogTitle>
            <AlertDialogDescription>ستبقى محفوظة في سجل الأنشطة كمتابعة ملغاة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>رجوع</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTarget && cancelActivity.mutate({ activityId: cancelTarget.id }, {
                onSuccess: () => setCancelTarget(null),
              })}
            >
              إلغاء المتابعة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default LeadActivityPanel;

