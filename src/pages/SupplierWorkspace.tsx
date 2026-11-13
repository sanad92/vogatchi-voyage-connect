import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { RefundLedgerSummary } from '@/components/finance/RefundLedgerSummary';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { PLAN_FEATURES } from '@/lib/planFeatures';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowRight, RefreshCw, MessageCircle, Mail, Star, Wallet,
  FileText, Phone, User, Pin, PlusCircle, Building2, Clock,
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
import SupplierContracts from '@/components/suppliers/SupplierContracts';
import SupplierCurrencyManager from '@/components/suppliers/SupplierCurrencyManager';
import SupplierRatings from '@/components/suppliers/SupplierRatings';
import SupplierPayments from '@/components/suppliers/SupplierPayments';
import { SupplierAccountSummary } from '@/components/suppliers/SupplierAccountSummary';

const currency = (n?: number, c?: string | null) =>
  `${Number(n ?? 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${c || 'EGP'}`;

const SupplierWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { hasPermission, getPermissionScope } = useSupabasePermissions();
  const { hasFeature } = useSubscription();
  const canViewFinance = hasFeature(PLAN_FEATURES.FINANCE) && hasPermission('financial_view')
    && getPermissionScope('financial_view') === 'organization';
  const canEditSupplier = hasPermission('suppliers_edit');
  const canManagePayments = hasPermission('payments_process') && getPermissionScope('payments_process') === 'organization';
  const s = useSupplier360(id, canViewFinance);
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const tabs = ['overview', 'bookings', 'documents', 'settings', 'timeline', ...(canViewFinance ? ['finance'] : [])];
  const requestedTab = params.get('tab') ?? '';
  const activeTab = tabs.includes(requestedTab) ? requestedTab : 'overview';

  useEffect(() => {
    if (activeTab === 'finance' && hash.startsWith('#supplier-invoice-') && !s.invoiceState.isPending) {
      const target = document.getElementById(hash.slice(1));
      target?.scrollIntoView({ block: 'center' });
      target?.focus({ preventScroll: true });
    }
  }, [activeTab, hash, s.invoiceState.isPending, s.supplier]);

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
      ts: p.created_at ?? '', icon: Wallet,
      label: `دفع للمورد ${currency(p.amount, p.currency)}`,
      sub: p.reference_number || p.notes || undefined,
    });
    for (const po of s.purchaseOrders) items.push({
      ts: po.created_at, icon: FileText,
      label: `أمر شراء ${po.reference_number} — ${po.status || ''}`,
      sub: currency(po.amount, po.currency),
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

  const sup = s.supplier;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/suppliers')}>
          <ArrowRight className="h-4 w-4 ml-1" /> الموردون
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">ملف المورد</span>
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
              <Badge variant="outline">{sup.type || sup.supplier_type}</Badge>
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
            {canViewFinance && (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/supplier-ledger?id=${id}`}><Wallet className="h-4 w-4 ml-1" /> كشف حساب المورد</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={tab => setParams(tab === 'overview' ? {} : { tab })} dir="rtl">
        <TabsList className="flex h-auto w-fit max-w-full flex-wrap justify-start">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="bookings">الحجوزات</TabsTrigger>
          {canViewFinance && <TabsTrigger value="finance">الحسابات</TabsTrigger>}
          <TabsTrigger value="documents">المستندات</TabsTrigger>
          <TabsTrigger value="settings">إعدادات المورد</TabsTrigger>
          <TabsTrigger value="timeline">السجل الزمني</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {id && canViewFinance && (
            <>
              <SupplierAccountSummary supplierId={id} invoices={s.invoices} state={s.invoiceState} />
              <RefundLedgerSummary kind="supplier" partyId={id} partyName={sup.name} />
            </>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">ملاحظات داخلية</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {canEditSupplier && <div className="flex gap-2">
                  <Textarea rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)}
                    placeholder="أضف ملاحظة حول المورد..." />
                  <Button size="sm" onClick={() => addNote.mutate()} disabled={!newNote.trim() || addNote.isPending}>
                    حفظ
                  </Button>
                </div>}
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
                {canEditSupplier && <Button size="sm" variant="outline" onClick={() => setContactOpen(true)}>
                  <PlusCircle className="h-4 w-4 ml-1" /> إضافة
                </Button>}
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
              { key: 'workflow_stage', label: 'المرحلة', render: r => ['cancelled', 'canceled'].includes(r.status) || r.workflow_stage === 'cancelled' ? 'ملغي' : r.workflow_stage },
              { key: 'total_amount', label: 'الإجمالي', render: (r: any) => currency(r.total_amount, r.currency) },
              { key: 'travel_date', label: 'تاريخ السفر' },
            ]}
            onRowClick={(r: any) => navigate(`/bookings/${r.id}/workspace`)}
          />
        </TabsContent>

        {id && canViewFinance && (
          <TabsContent value="finance" className="mt-4 space-y-4">
            <ListCard title="فواتير الموردين" rows={s.invoices} state={s.invoiceState}
              rowAnchor={r => `supplier-invoice-${r.id}`}
              columns={[
                { key: 'invoice_number', label: 'رقم', render: r => r.payment_order_id
                  ? <Link className="text-primary underline" to={`/payment-orders?id=${r.payment_order_id}`}>{r.invoice_number}</Link>
                  : r.invoice_number },
                { key: 'invoice_date', label: 'التاريخ' },
                { key: 'due_date', label: 'الاستحقاق' },
                { key: 'amount', label: 'الإجمالي', render: r => currency(r.amount, r.currency) },
                { key: 'amount_paid', label: 'المسدّد', render: r => currency(r.amount_paid, r.currency) },
                { key: 'status', label: 'الحالة', render: r => ({
                  unpaid: 'غير مدفوع', partial: 'مدفوع جزئيًا', paid: 'مدفوع', cancelled: 'ملغي',
                })[r.status] || r.status },
              ]}
            />
            <ListCard title="أوامر دفع الموردين" rows={s.purchaseOrders} state={s.orderState}
              columns={[
                { key: 'reference_number', label: 'المرجع', render: r =>
                  <Link className="text-primary underline" to={`/payment-orders?id=${r.id}`}>{r.reference_number}</Link> },
                { key: 'status', label: 'الحالة', render: r => r.status === 'cancelled' ? 'ملغي' : r.approval_status === 'rejected' ? 'مرفوض' : r.status },
                { key: 'amount', label: 'المبلغ', render: r => currency(r.amount, r.currency) },
                { key: 'due_date', label: 'الاستحقاق' },
              ]}
            />
            <SupplierPayments key={id} supplierId={id} canManage={canManagePayments}
              payments={s.payments} state={s.paymentState} />
            <RefundLedgerSummary kind="supplier" partyId={id} partyName={sup.name} showHistory />
          </TabsContent>
        )}

        <TabsContent value="documents" className="mt-4">
          <DocumentsPanel supplierId={id} title="مستندات المورد" defaultCategory="contract" />
        </TabsContent>

        {id && (
          <TabsContent value="settings" className="mt-4">
            <Tabs defaultValue="contracts" dir="rtl">
              <TabsList>
                <TabsTrigger value="contracts">العقود</TabsTrigger>
                <TabsTrigger value="currencies">العملات</TabsTrigger>
                <TabsTrigger value="ratings">التقييمات</TabsTrigger>
              </TabsList>
              <TabsContent value="contracts"><SupplierContracts key={id} supplierId={id} canEdit={canEditSupplier} /></TabsContent>
              <TabsContent value="currencies"><SupplierCurrencyManager supplierId={id} canEdit={canEditSupplier} /></TabsContent>
              <TabsContent value="ratings"><SupplierRatings key={id} supplierId={id} canEdit={canEditSupplier} /></TabsContent>
            </Tabs>
          </TabsContent>
        )}

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

interface Col { key: string; label: string; render?: (r: any) => any }
const ListCard = ({
  title, rows, columns, onRowClick, rowAnchor, state,
}: { title: string; rows: any[]; columns: Col[]; onRowClick?: (r: any) => void; rowAnchor?: (r: any) => string; state?: { isError: boolean; isPending: boolean } }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="overflow-x-auto">
      {state?.isError ? (
        <p role="alert" className="text-sm text-destructive">تعذر تحميل البيانات.</p>
      ) : state?.isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
      ) : rows.length === 0 ? (
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
              <tr key={r.id} id={rowAnchor?.(r)} tabIndex={rowAnchor ? -1 : undefined}
                className={'border-b hover:bg-muted/40 target:bg-primary/10 ' + (onRowClick ? 'cursor-pointer' : '')}
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
