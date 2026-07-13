import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Megaphone, Plus, Send, Trash2, Ban, Users, Clock, CheckCircle2, XCircle, Loader2,
  Eye, AlertTriangle, CheckCheck, Check,
} from 'lucide-react';
import { useWhatsAppBroadcasts, useBroadcastRecipients, WhatsAppBroadcast } from '@/hooks/useWhatsAppBroadcasts';
import { useCustomers } from '@/hooks/useCustomers';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusMap: Record<WhatsAppBroadcast['status'], { label: string; variant: any; icon: any }> = {
  draft: { label: 'مسودة', variant: 'secondary', icon: Clock },
  scheduled: { label: 'مجدولة', variant: 'outline', icon: Clock },
  sending: { label: 'جارٍ الإرسال', variant: 'default', icon: Loader2 },
  completed: { label: 'مكتملة', variant: 'default', icon: CheckCircle2 },
  failed: { label: 'فشلت', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'ملغاة', variant: 'secondary', icon: Ban },
};

export const WhatsAppBroadcastManager: React.FC = () => {
  const { broadcasts, isLoading, createBroadcast, sendBroadcast, cancelBroadcast, deleteBroadcast, isCreating, isSending } =
    useWhatsAppBroadcasts();
  const { customers } = useCustomers();
  const { templates } = useWhatsAppTemplates();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', message_body: '',
    template_id: 'none' as string,
    audience_type: 'all' as WhatsAppBroadcast['audience_type'],
    scheduled_at: '',
  });
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  const eligibleCustomers = useMemo(
    () => (customers || []).filter((c: any) => !!c.phone),
    [customers],
  );

  const recipients = useMemo(() => {
    if (form.audience_type === 'all') {
      return eligibleCustomers.map((c: any) => ({
        phone_number: c.phone, customer_id: c.id, customer_name: c.name,
        personalization: { customer_name: c.name },
      }));
    }
    if (form.audience_type === 'manual') {
      return eligibleCustomers
        .filter((c: any) => selectedCustomerIds.has(c.id))
        .map((c: any) => ({
          phone_number: c.phone, customer_id: c.id, customer_name: c.name,
          personalization: { customer_name: c.name },
        }));
    }
    return [];
  }, [form.audience_type, eligibleCustomers, selectedCustomerIds]);

  const resetForm = () => {
    setForm({ name: '', description: '', message_body: '', template_id: 'none', audience_type: 'all', scheduled_at: '' });
    setSelectedCustomerIds(new Set());
  };

  const handleCreate = async (sendNow: boolean) => {
    if (!form.name || !form.message_body) return;
    const created = await createBroadcast({
      name: form.name,
      description: form.description,
      message_body: form.message_body,
      template_id: form.template_id !== 'none' ? form.template_id : null,
      audience_type: form.audience_type,
      scheduled_at: form.scheduled_at || null,
      recipients,
    });
    setOpen(false);
    resetForm();
    if (sendNow && created?.id) {
      await sendBroadcast(created.id);
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" />
            الحملات والبث الجماعي
          </h2>
          <p className="text-muted-foreground mt-1">إرسال حملات WhatsApp مستهدفة لعملائك</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 ml-1" /> حملة جديدة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>حملة WhatsApp جديدة</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>اسم الحملة *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>الجدولة (اختياري)</Label>
                  <Input type="datetime-local" value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>الوصف</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الجمهور</Label>
                  <Select value={form.audience_type} onValueChange={(v: any) => setForm({ ...form, audience_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل العملاء ({eligibleCustomers.length})</SelectItem>
                      <SelectItem value="manual">اختيار يدوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>القالب (اختياري)</Label>
                  <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
                    <SelectTrigger><SelectValue placeholder="بدون قالب" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون قالب</SelectItem>
                      {(templates || []).filter((t: any) => t.status === 'approved').map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>الرسالة * (يدعم {'{{customer_name}}'})</Label>
                <Textarea rows={5} value={form.message_body}
                  onChange={(e) => setForm({ ...form, message_body: e.target.value })} />
              </div>

              {form.template_id === 'none' && (
                <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900 dark:text-amber-200">تنبيه: قيود نافذة الـ 24 ساعة</AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                    الرسائل النصية الحرة تصل فقط للعملاء الذين راسلوا رقمك خلال آخر <strong>24 ساعة</strong>.
                    باقي الأرقام سيرفضها واتساب بالخطأ <code className="text-xs">131047 (Re-engagement)</code>.
                    <br />لإرسال حملة لجميع العملاء، اختر <strong>قالباً معتمداً</strong> من Meta بدلاً من الرسالة الحرة.
                  </AlertDescription>
                </Alert>
              )}

              {form.audience_type === 'manual' && (
                <div className="border rounded-md p-2 max-h-52 overflow-y-auto space-y-1">
                  {eligibleCustomers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">لا يوجد عملاء بأرقام هواتف</p>
                  )}
                  {eligibleCustomers.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedCustomerIds.has(c.id)} onChange={() => toggleCustomer(c.id)} />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.phone}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                عدد المستلمين: <strong className="text-foreground">{recipients.length}</strong>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button variant="secondary" onClick={() => handleCreate(false)}
                disabled={isCreating || !form.name || !form.message_body || recipients.length === 0}>
                حفظ كمسودة
              </Button>
              <Button onClick={() => handleCreate(true)}
                disabled={isCreating || isSending || !form.name || !form.message_body || recipients.length === 0}>
                <Send className="w-4 h-4 ml-1" /> إنشاء وإرسال
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>الحملات</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-50" />
              لا توجد حملات بعد
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المستلمون</TableHead>
                  <TableHead>التقدم</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => {
                  const s = statusMap[b.status];
                  const Icon = s.icon;
                  const progress = b.total_recipients > 0
                    ? Math.round(((b.sent_count + b.failed_count) / b.total_recipients) * 100) : 0;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="font-medium">{b.name}</div>
                        {b.description && <div className="text-xs text-muted-foreground">{b.description}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.variant} className="gap-1">
                          <Icon className={`w-3 h-3 ${b.status === 'sending' ? 'animate-spin' : ''}`} />
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{b.total_recipients}</TableCell>
                      <TableCell className="min-w-[140px]">
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
                          <span>{b.sent_count} أُرسل</span>
                          <span className="text-emerald-600">{b.delivered_count} مُسلَّم</span>
                          <span className="text-teal-600">{b.read_count} مقروء</span>
                          <span className="text-red-600">{b.failed_count} فشل</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(b.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <BroadcastDetailsButton broadcast={b} />
                          {(b.status === 'draft' || b.status === 'scheduled') && (
                            <Button size="sm" variant="ghost" onClick={() => sendBroadcast(b.id)} disabled={isSending}>
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          {(b.status === 'scheduled' || b.status === 'sending') && (
                            <Button size="sm" variant="ghost" onClick={() => cancelBroadcast(b.id)}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteBroadcast(b.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Broadcast details dialog: per-recipient delivery status with live updates.
// ---------------------------------------------------------------------------

const recipientStatusMeta: Record<string, { label: string; className: string; icon: any }> = {
  pending:   { label: 'في الانتظار', className: 'bg-muted text-muted-foreground',           icon: Clock },
  sent:      { label: 'مُرسل',        className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200', icon: Check },
  delivered: { label: 'مُسلَّم',      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', icon: CheckCheck },
  read:      { label: 'مقروء',        className: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200', icon: Eye },
  failed:    { label: 'فشل',          className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200', icon: XCircle },
  skipped:   { label: 'متجاوز',       className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', icon: Ban },
};

const BroadcastDetailsButton: React.FC<{ broadcast: WhatsAppBroadcast }> = ({ broadcast }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="تفاصيل الحملة">
        <Eye className="w-4 h-4" />
      </Button>
      {open && <BroadcastDetailsDialog broadcast={broadcast} open={open} onOpenChange={setOpen} />}
    </>
  );
};

const BroadcastDetailsDialog: React.FC<{
  broadcast: WhatsAppBroadcast;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}> = ({ broadcast, open, onOpenChange }) => {
  const { data: recipients = [], isLoading } = useBroadcastRecipients(broadcast.id);
  const qc = useQueryClient();

  // Realtime: refresh recipient list when webhook updates rows.
  useEffect(() => {
    if (!open) return;
    const channel = supabase.channel(`wa-broadcast-recipients-${broadcast.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'whatsapp_broadcast_recipients',
        filter: `broadcast_id=eq.${broadcast.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ['broadcast-recipients', broadcast.id] });
        qc.invalidateQueries({ queryKey: ['whatsapp-broadcasts', broadcast.organization_id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, broadcast.id, broadcast.organization_id, qc]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0 };
    for (const r of recipients as any[]) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [recipients]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> {broadcast.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-sm mb-4">
          {(['pending','sent','delivered','read','failed','skipped'] as const).map((k) => {
            const meta = recipientStatusMeta[k];
            const Icon = meta.icon;
            return (
              <div key={k} className={`rounded-md p-2 ${meta.className}`}>
                <Icon className="w-4 h-4 mx-auto mb-1" />
                <div className="font-bold">{counts[k] ?? 0}</div>
                <div className="text-xs">{meta.label}</div>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : recipients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا يوجد مستلمون</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستلم</TableHead>
                  <TableHead>الرقم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>سبب الفشل</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recipients as any[]).map((r) => {
                  const meta = recipientStatusMeta[r.status] ?? recipientStatusMeta.pending;
                  const Icon = meta.icon;
                  const lastTs = r.read_at || r.delivered_at || r.failed_at || r.sent_at || r.updated_at || r.created_at;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.customer_name || '—'}</TableCell>
                      <TableCell className="text-xs font-mono" dir="ltr">{r.phone_number}</TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${meta.className}`} variant="outline">
                          <Icon className="w-3 h-3" /> {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {r.status === 'failed' ? (
                          <div className="space-y-1">
                            <div className="text-red-700 dark:text-red-300">{r.error_message || 'فشل غير محدد'}</div>
                            {r.error_code && (
                              <div className="text-muted-foreground">
                                رمز الخطأ: <code className="text-xs">{r.error_code}</code>
                                {r.error_code === '131047' && ' — انتهت نافذة الـ 24 ساعة، استخدم قالباً معتمداً'}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lastTs ? format(new Date(lastTs), 'dd MMM HH:mm:ss', { locale: ar }) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
