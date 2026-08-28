import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Phone, Mail, MessageSquare, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useCustomerService } from '@/hooks/useCustomerService';
import { useCustomers } from '@/hooks/useCustomers';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';

type FollowUpForm = {
  customer_id: string;
  follow_up_type: string;
  scheduled_date: string;
  priority: string;
  notes: string;
};

const EMPTY_FORM: FollowUpForm = {
  customer_id: '',
  follow_up_type: 'phone_call',
  scheduled_date: '',
  priority: 'normal',
  notes: '',
};

type FollowUpRecord = {
  id: string;
  customer_id: string | null;
  follow_up_type: string;
  scheduled_date: string;
  status: string | null;
  priority: string | null;
  notes: string | null;
  customer?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  assigned_to_profile?: { full_name?: string | null } | null;
};

const getEffectiveStatus = (followUp: FollowUpRecord, today: string) =>
  followUp.status === 'pending' && followUp.scheduled_date < today ? 'overdue' : (followUp.status || 'pending');

const CustomerFollowUps = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FollowUpForm>(EMPTY_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { followUps, isLoading, isCreating, isUpdating, createFollowUp, updateFollowUp, markFollowUpComplete } = useCustomerService();
  const { customers = [] } = useCustomers();
  const { hasPermission } = useSupabasePermissions();
  const canManage = hasPermission('crm_follow_ups');
  const today = new Date().toISOString().slice(0, 10);

  const records = followUps as FollowUpRecord[];

  const filteredFollowUps = useMemo(() => records.filter((followUp) => {
    const matchesStatus = statusFilter === 'all' || getEffectiveStatus(followUp, today) === statusFilter;
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search
      || followUp.customer?.name?.toLowerCase().includes(search)
      || followUp.customer?.phone?.includes(searchTerm.trim())
      || followUp.notes?.toLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  }), [records, searchTerm, statusFilter, today]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (followUp: FollowUpRecord) => {
    setEditingId(followUp.id);
    setForm({
      customer_id: followUp.customer_id || '',
      follow_up_type: followUp.follow_up_type || 'phone_call',
      scheduled_date: followUp.scheduled_date || '',
      priority: followUp.priority || 'normal',
      notes: followUp.notes || '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.customer_id || !form.scheduled_date || !form.follow_up_type) return;
    if (editingId) await updateFollowUp(editingId, form);
    else await createFollowUp(form);
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const statusLabel = (status: string) => status === 'completed' ? 'مكتملة' : status === 'overdue' ? 'متأخرة' : 'قيد الانتظار';
  const statusClass = (status: string) => status === 'completed'
    ? 'bg-green-100 text-green-800'
    : status === 'overdue'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
  const typeIcon = (type: string) => type === 'email'
    ? <Mail className="h-4 w-4" />
    : type === 'whatsapp'
      ? <MessageSquare className="h-4 w-4" />
      : <Phone className="h-4 w-4" />;

  const stats = {
    total: records.length,
    pending: records.filter((item) => getEffectiveStatus(item, today) === 'pending').length,
    completed: records.filter((item) => getEffectiveStatus(item, today) === 'completed').length,
    overdue: records.filter((item) => getEffectiveStatus(item, today) === 'overdue').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">متابعة العملاء</h2>
        {canManage && <Button onClick={openCreate}><Plus className="h-4 w-4 ml-2" />إضافة متابعة</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          ['إجمالي المتابعات', stats.total, Calendar, 'text-blue-500'],
          ['قيد الانتظار', stats.pending, Clock, 'text-yellow-500'],
          ['مكتملة', stats.completed, CheckCircle, 'text-green-500'],
          ['متأخرة', stats.overdue, AlertCircle, 'text-red-500'],
        ] as [string, number, LucideIcon, string][]).map(([label, value, Icon, color]) => (
          <Card key={label}><CardContent className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
            <Icon className={`h-7 w-7 ${color}`} />
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="بحث باسم العميل أو الهاتف أو الملاحظات..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="sm:max-w-md" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="overdue">متأخرة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {isLoading ? <div className="text-center py-8">جاري تحميل المتابعات...</div> : filteredFollowUps.length ? filteredFollowUps.map((followUp) => {
          const status = getEffectiveStatus(followUp, today);
          return <Card key={followUp.id}><CardContent className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {typeIcon(followUp.follow_up_type)}
                <span className="font-semibold">{followUp.customer?.name || 'عميل غير محدد'}</span>
                <Badge className={statusClass(status)}>{statusLabel(status)}</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {followUp.customer?.phone && <p>📞 {followUp.customer.phone}</p>}
                {followUp.customer?.email && <p>📧 {followUp.customer.email}</p>}
                <p>📅 {format(new Date(`${followUp.scheduled_date}T00:00:00`), 'PPP', { locale: ar })}</p>
                {followUp.assigned_to_profile?.full_name && <p>👤 {followUp.assigned_to_profile.full_name}</p>}
              </div>
              {followUp.notes && <p className="text-sm bg-muted/50 rounded-md p-3">{followUp.notes}</p>}
            </div>
            {canManage && <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(followUp)} disabled={isUpdating}>تعديل</Button>
              {status !== 'completed' && <Button size="sm" onClick={() => markFollowUpComplete(followUp.id)} disabled={isUpdating}>تمت المتابعة</Button>}
            </div>}
          </CardContent></Card>;
        }) : <Card><CardContent className="text-center py-10 text-muted-foreground">لا توجد متابعات تطابق البحث.</CardContent></Card>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'تعديل المتابعة' : 'إضافة متابعة جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>العميل</Label><Select value={form.customer_id} onValueChange={(value) => setForm({ ...form, customer_id: value })} disabled={!!editingId}>
              <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
              <SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ''}</SelectItem>)}</SelectContent>
            </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>نوع المتابعة</Label><Select value={form.follow_up_type} onValueChange={(value) => setForm({ ...form, follow_up_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="phone_call">مكالمة</SelectItem><SelectItem value="whatsapp">واتساب</SelectItem><SelectItem value="email">بريد إلكتروني</SelectItem><SelectItem value="meeting">اجتماع</SelectItem></SelectContent></Select></div>
              <div><Label>الأولوية</Label><Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">منخفضة</SelectItem><SelectItem value="normal">عادية</SelectItem><SelectItem value="high">عالية</SelectItem><SelectItem value="urgent">عاجلة</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>التاريخ</Label><Input type="date" value={form.scheduled_date} onChange={(event) => setForm({ ...form, scheduled_date: event.target.value })} /></div>
            <div><Label>ملاحظات</Label><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={save} disabled={isCreating || isUpdating || !form.customer_id || !form.scheduled_date}>حفظ</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerFollowUps;
