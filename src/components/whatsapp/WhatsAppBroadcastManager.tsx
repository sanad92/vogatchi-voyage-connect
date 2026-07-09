import React, { useMemo, useState } from 'react';
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
import {
  Megaphone, Plus, Send, Trash2, Ban, Users, Clock, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { useWhatsAppBroadcasts, WhatsAppBroadcast } from '@/hooks/useWhatsAppBroadcasts';
import { useCustomers } from '@/hooks/useCustomers';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
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
                        <div className="text-xs text-muted-foreground mt-1">
                          {b.sent_count} أُرسل · {b.failed_count} فشل
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(b.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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
