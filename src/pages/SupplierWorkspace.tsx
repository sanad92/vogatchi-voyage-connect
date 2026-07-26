import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowRight, RefreshCw, MessageCircle, Mail, Star, Wallet,
  FileText, Phone, User, Pin, PlusCircle, Building2, TrendingUp, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSupplier360 } from '@/hooks/useSupplier360';
import { useOrgId } from '@/hooks/useOrgId';
import { DocumentsPanel } from '@/components/documents/DocumentsPanel';

const currency = (n?: number, c = 'EGP') =>
  `${Number(n ?? 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${c}`;

const SupplierWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgId = useOrgId();
  const qc = useQueryClient();
  const s = useSupplier360(id);

  const [newNote, setNewNote] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '', role: '', email: '', phone: '', whatsapp: '', is_primary: false,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!newNote.trim() || !orgId || !id) return;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('supplier_notes').insert({
        supplier_id: id, organization_id: orgId,
        body: newNote.trim(), author_id: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote('');
      qc.invalidateQueries({ queryKey: ['sup360-notes', id] });
      toast.success('تم حفظ الملاحظة');
    },
  });

  const addContact = useMutation({
    mutationFn: async () => {
      if (!orgId || !id) return;
      const { error } = await (supabase as any).from('supplier_contacts').insert({
        supplier_id: id, organization_id: orgId, ...contactForm,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContactOpen(false);
      setContactForm({ name: '', role: '', email: '', phone: '', whatsapp: '', is_primary: false });
      qc.invalidateQueries({ queryKey: ['sup360-contacts', id] });
      toast.success('تمت إضافة جهة الاتصال');
    },
  });

  const timeline = useMemo(() => {
    const items: Array<{ ts: string; icon: any; label: string; sub?: string }> = [];
    for (const p of s.payments) items.push({
      ts: p.created_at, icon: Wallet,
      label: `دفع للمورد ${currency(p.amount, p.currency)}`,
      sub: p.reference_number || p.notes,
    });
    for (const po of s.purchaseOrders) items.push({
      ts: po.created_at, icon: FileText,
      label: `أمر شراء ${po.po_number || po.id.slice(0, 8)} — ${po.status || ''}`,
      sub: currency(po.total_amount, po.currency),
    });
    for (const b of s.bookings) items.push({
      ts: b.created_at, icon: Building2,
      label: `حجز ${b.booking_reference || b.id.slice(0, 8)} — ${b.customer_name || ''}`,
      sub: currency(b.total_amount, b.currency),
    });
    return items
      .filter((i) => i.ts)
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, 40);
  }, [s.payments, s.purchaseOrders, s.bookings]);

  if (s.isLoading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  if (!s.supplier) return (
    <div className="p-8 text-center space-y-3" dir="rtl">
      <p className="text-destructive">تعذر تحميل المورد</p>
      <Button variant="ghost" onClick={() => navigate('/suppliers')}>
        <ArrowRight className="h-4 w-4 ml-1" /> رجوع
      </Button>
    </div>
  );

  const sup: any = s.supplier;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')}>
          <ArrowRight className="h-4 w-4 ml-1" /> الموردون
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Supplier 360</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={() => s.refetch()} title="تحديث">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Executive header */}
      <Card>
        <CardContent className="p-4 md:p-6 flex flex-wrap items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold truncate">{sup.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Badge variant="outline">{sup.supplier_type}</Badge>
              {sup.rating && <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" /> {Number(sup.rating).toFixed(1)}</Badge>}
              {sup.payment_type && <Badge variant="outline">{sup.payment_type === 'prepaid' ? 'دفع مسبق' : 'دفع لاحق'}</Badge>}
              {sup.is_active === false && <Badge variant="destructive">غير نشط</Badge>}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              {sup.contact_person && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {sup.contact_person}</span>}
              {sup.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {sup.phone}</span>}
              {sup.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {sup.email}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {sup.phone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`https://wa.me/${String(sup.phone).replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 ml-1" /> واتساب
                </a>
              </Button>
            )}
            {sup.email && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${sup.email}`}><Mail className="h-4 w-4 ml-1" /> بريد</a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate(`/supplier-ledger?supplier_id=${id}`)}>
              <Wallet className="h-4 w-4 ml-1" /> السجل المالي
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="إجمالي المشتريات" value={currency(s.kpi.totalPurchases)} icon={TrendingUp} />
        <KpiCard label="المدفوع" value={currency(s.kpi.totalPaid)} icon={Wallet} />
        <KpiCard label="الرصيد المستحق" value={currency(s.kpi.outstandingBalance)} icon={Wallet}
                 tone={s.kpi.outstandingBalance > 0 ? 'warning' : 'ok'} />
        <KpiCard label="الحجوزات" value={String(s.kpi.bookingsCount)} icon={Building2} />
        <KpiCard label="أوامر شراء مفتوحة" value={String(s.kpi.openPOs)} icon={FileText} />
        <KpiCard label="التقييم" value={s.kpi.avgRating ? s.kpi.avgRating.toFixed(1) : '—'} icon={Star} />
      </div>

      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 h-auto">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
          <TabsTrigger value="pos">أوامر الشراء</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          <TabsTrigger value="documents">المستندات</TabsTrigger>
          <TabsTrigger value="contacts">الاتصالات</TabsTrigger>
          <TabsTrigger value="timeline">السجل الزمني</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">ملاحظات داخلية</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Textarea rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)}
                    placeholder="أضف ملاحظة حول المورد..." />
                  <Button size="sm" onClick={() => addNote.mutate()} disabled={!newNote.trim() || addNote.isPending}>
                    حفظ
                  </Button>
                </div>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {s.notes.length === 0 && <p className="text-xs text-muted-foreground">لا توجد ملاحظات.</p>}
                  {s.notes.map((n: any) => (
                    <div key={n.id} className="border rounded-md p-2 text-sm">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(n.created_at), 'yyyy-MM-dd HH:mm')}</span>
                        {n.pinned && <Pin className="h-3 w-3" />}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">جهات الاتصال</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setContactOpen(true)}>
                  <PlusCircle className="h-4 w-4 ml-1" /> إضافة
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {s.contacts.length === 0 && <p className="text-xs text-muted-foreground">لا توجد جهات اتصال.</p>}
                {s.contacts.map((c: any) => (
                  <div key={c.id} className="border rounded-md p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{c.name}</p>
                      {c.is_primary && <Badge variant="secondary" className="text-[10px]">أساسي</Badge>}
                    </div>
                    {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                    <div className="flex flex-wrap gap-3 text-xs mt-1">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                      {c.whatsapp && <a className="flex items-center gap-1 text-primary" href={`https://wa.me/${String(c.whatsapp).replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle className="h-3 w-3" /> {c.whatsapp}</a>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <ListCard title="الحجوزات" rows={s.bookings}
            columns={[
              { key: 'booking_reference', label: 'المرجع' },
              { key: 'customer_name', label: 'العميل' },
              { key: 'workflow_stage', label: 'المرحلة' },
              { key: 'total_amount', label: 'الإجمالي', render: (r: any) => currency(r.total_amount, r.currency) },
              { key: 'travel_date', label: 'تاريخ السفر' },
            ]}
            onRowClick={(r: any) => navigate(`/bookings/${r.id}/workspace`)}
          />
        </TabsContent>

        <TabsContent value="pos" className="mt-4">
          <ListCard title="أوامر الشراء" rows={s.purchaseOrders}
            columns={[
              { key: 'po_number', label: 'رقم' },
              { key: 'status', label: 'الحالة' },
              { key: 'total_amount', label: 'الإجمالي', render: (r: any) => currency(r.total_amount, r.currency) },
              { key: 'due_date', label: 'الاستحقاق' },
              { key: 'created_at', label: 'أنشئ', render: (r: any) => r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd') : '' },
            ]}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <ListCard title="المدفوعات" rows={s.payments}
            columns={[
              { key: 'reference_number', label: 'المرجع' },
              { key: 'payment_date', label: 'التاريخ' },
              { key: 'amount', label: 'المبلغ', render: (r: any) => currency(r.amount, r.currency) },
              { key: 'payment_method', label: 'الوسيلة' },
              { key: 'status', label: 'الحالة' },
            ]}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <ListCard title="فواتير الموردين" rows={s.invoices}
            columns={[
              { key: 'invoice_number', label: 'رقم' },
              { key: 'issue_date', label: 'التاريخ' },
              { key: 'total_amount', label: 'الإجمالي', render: (r: any) => currency(r.total_amount, r.currency) },
              { key: 'status', label: 'الحالة' },
            ]}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel supplierId={id} title="مستندات المورد" defaultCategory="contract" />
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <ListCard title="جهات الاتصال" rows={s.contacts}
            columns={[
              { key: 'name', label: 'الاسم' },
              { key: 'role', label: 'الدور' },
              { key: 'phone', label: 'هاتف' },
              { key: 'email', label: 'بريد' },
              { key: 'is_primary', label: 'أساسي', render: (r: any) => r.is_primary ? 'نعم' : '' },
            ]}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> السجل الزمني</CardTitle></CardHeader>
            <CardContent>
              {timeline.length === 0 && <p className="text-xs text-muted-foreground">لا توجد أحداث.</p>}
              <div className="space-y-2">
                {timeline.map((it, i) => {
                  const Icon = it.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 border rounded-md p-2 text-sm">
                      <Icon className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{it.label}</p>
                        {it.sub && <p className="text-xs text-muted-foreground truncate">{it.sub}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(it.ts), 'yyyy-MM-dd')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add contact dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة جهة اتصال</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>الاسم</Label>
              <Input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
            </div>
            <div><Label>الدور</Label>
              <Input value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} />
            </div>
            <div><Label>هاتف</Label>
              <Input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
            </div>
            <div><Label>بريد</Label>
              <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
            </div>
            <div><Label>واتساب</Label>
              <Input value={contactForm.whatsapp} onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={contactForm.is_primary}
                onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })} />
              جهة اتصال أساسية
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>إلغاء</Button>
            <Button onClick={() => addContact.mutate()} disabled={!contactForm.name || addContact.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const KpiCard = ({
  label, value, icon: Icon, tone,
}: { label: string; value: string; icon: any; tone?: 'ok' | 'warning' }) => (
  <Card>
    <CardContent className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={
        'text-lg font-bold mt-1 ' +
        (tone === 'warning' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : '')
      }>{value}</p>
    </CardContent>
  </Card>
);

interface Col { key: string; label: string; render?: (r: any) => any }
const ListCard = ({
  title, rows, columns, onRowClick,
}: { title: string; rows: any[]; columns: Col[]; onRowClick?: (r: any) => void }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="overflow-x-auto">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">لا توجد بيانات.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              {columns.map((c) => <th key={c.key} className="text-right p-2">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id}
                className={'border-b hover:bg-muted/40 ' + (onRowClick ? 'cursor-pointer' : '')}
                onClick={() => onRowClick?.(r)}>
                {columns.map((c) => (
                  <td key={c.key} className="p-2">{c.render ? c.render(r) : (r[c.key] ?? '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CardContent>
  </Card>
);

export default SupplierWorkspace;
