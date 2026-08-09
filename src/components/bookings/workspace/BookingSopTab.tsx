import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CalendarClock, CheckCircle2, Plus } from 'lucide-react';
import {
  useCompleteDeadline,
  useIncidents,
  useOperationalDeadlines,
  usePostTripActions,
  useSaveIncident,
  useSopLeadForBooking,
  useUpdatePostTripAction,
} from '@/hooks/useSop';
import { DEADLINE_LABELS, type SopDeadlineType } from '@/lib/sop';
import HandoverDialog from '@/components/sop/HandoverDialog';
import SopLeadPanel from '@/components/sop/SopLeadPanel';

interface Props {
  bookingId: string;
}

/** Operations side of the SOP: deadlines, incidents, post-trip and the ops handover. */
export const BookingSopTab = ({ bookingId }: Props) => {
  const { data: deadlines } = useOperationalDeadlines({ bookingId });
  const { data: incidents } = useIncidents({ bookingId });
  const { data: postTrip } = usePostTripActions({ bookingId });
  const { data: lead } = useSopLeadForBooking(bookingId);
  const completeDeadline = useCompleteDeadline();
  const saveIncident = useSaveIncident();
  const updatePostTrip = useUpdatePostTripAction();
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({ title: '', severity: 'medium', description: '' });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> المواعيد التشغيلية
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setHandoverOpen(true)}>
              تسليم الحجوزات ← خدمة العملاء
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(deadlines || []).map((d: any) => {
              const overdue = !d.completed_at && new Date(d.due_at) < new Date();
              return (
                <div key={d.id} className="flex items-center justify-between border rounded p-2 text-xs">
                  <div>
                    <div className="font-medium">{DEADLINE_LABELS[d.deadline_type as SopDeadlineType] || d.deadline_type}</div>
                    <div className={overdue ? 'text-destructive' : 'text-muted-foreground'}>
                      {new Date(d.due_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                  {d.completed_at ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> مكتمل
                    </Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => completeDeadline.mutate({ id: d.id })}>
                      تم التنفيذ
                    </Button>
                  )}
                </div>
              );
            })}
            {!deadlines?.length && <p className="text-xs text-muted-foreground">لا توجد مواعيد مسجلة.</p>}
          </CardContent>
        </Card>

        <div>{lead && <SopLeadPanel leadId={lead.id} compact />}</div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> الشكاوى والحوادث
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(incidents || []).map((i: any) => (
            <div key={i.id} className="border rounded p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{i.title}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={i.severity === 'high' || i.severity === 'critical' ? 'destructive' : 'outline'}>
                    {i.severity}
                  </Badge>
                  {i.status !== 'resolved' && (
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => saveIncident.mutate({ id: i.id, status: 'resolved', resolved_at: new Date().toISOString() } as any)}
                    >
                      إغلاق
                    </Button>
                  )}
                </div>
              </div>
              {i.description && <p className="text-muted-foreground">{i.description}</p>}
            </div>
          ))}

          <div className="grid gap-2 sm:grid-cols-3 items-end border-t pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">عنوان الشكوى</Label>
              <Input value={newIncident.title} onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الخطورة</Label>
              <Select value={newIncident.severity} onValueChange={(v) => setNewIncident({ ...newIncident, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="critical">حرجة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!newIncident.title}
              onClick={() => {
                saveIncident.mutate({ ...newIncident, booking_id: bookingId } as any);
                setNewIncident({ title: '', severity: 'medium', description: '' });
              }}
            >
              <Plus className="h-3.5 w-3.5 ml-1" /> تسجيل شكوى
            </Button>
            <Textarea
              className="sm:col-span-3" rows={2} placeholder="وصف المشكلة والإجراء المتخذ"
              value={newIncident.description}
              onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">ما بعد الرحلة</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(postTrip || []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border rounded p-2 text-xs">
              <span>{p.action_type}</span>
              {p.completed_at ? (
                <Badge variant="outline">تم</Badge>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => updatePostTrip.mutate({ id: p.id, completed: true })}>
                  تنفيذ
                </Button>
              )}
            </div>
          ))}
          {!postTrip?.length && <p className="text-xs text-muted-foreground">لا توجد إجراءات ما بعد الرحلة بعد.</p>}
        </CardContent>
      </Card>

      {handoverOpen && lead && (
        <HandoverDialog open onClose={() => setHandoverOpen(false)} leadId={lead.id} type="reservations_to_cs" />
      )}
    </div>
  );
};

export default BookingSopTab;
