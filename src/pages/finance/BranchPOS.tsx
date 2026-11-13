import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ReceiptText } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBranches } from '@/hooks/useBranchesDepartments';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { supabase } from '@/integrations/supabase/client';

type Account = { id: string; account_name: string; currency: string; treasury_kind: string; sales_branch_id: string | null };
type Terminal = { id: string; name: string; branch_id: string; cash_account_id: string; is_active: boolean };
type Shift = { id: string; terminal_id: string; opened_by: string; opened_at: string; closed_at: string | null; currency: string;
  opening_cash: number; expected_cash: number | null; counted_cash: number | null; variance_reviewed_at: string | null };
type Invoice = { id: string; invoice_number: string; customer_name: string | null; booking_number: string | null;
  sales_branch_id: string | null; currency: string; final_amount: number; remaining_amount: number; status: string };
type Receipt = { id: string; invoice_number: string; customer_name: string | null; amount: number; currency: string;
  method: string; created_at: string; reference: string | null };
const methods = [
  { id: 'cash', label: 'نقدي', accounts: ['cash'] },
  { id: 'bank_transfer', label: 'تحويل بنكي', accounts: ['bank'] },
  { id: 'credit_card', label: 'بطاقة', accounts: ['bank', 'card', 'gateway'] },
  { id: 'payment_link', label: 'رابط دفع مؤكد', accounts: ['bank', 'gateway', 'wallet'] },
];
const money = (value: number | null) => Number(value ?? 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const localDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(date);
const db = supabase as any;

async function rpc<T>(name: string, args: Record<string, unknown>) {
  const { data, error } = await callUntypedRpc<T>(name, args);
  if (error) throw error;
  return data;
}

export default function BranchPOS() {
  const orgId = useOrgId();
  return orgId ? <POSWorkspace key={orgId} orgId={orgId} /> : null;
}

function POSWorkspace({ orgId }: { orgId: string }) {
  const { user } = useOptimizedAuth();
  const { members, currentUserRole } = useOrgMembers();
  const { hasPermission } = useSupabasePermissions();
  const { data: branches = [] } = useBranches();
  const { data: accounts = [], isError: accountsError } = useQuery({
    queryKey: ['pos', orgId, 'accounts'],
    queryFn: async () => (await rpc<Account[]>('pos_accounts', { _org: orgId })) ?? [],
  });
  const queryClient = useQueryClient();
  const manager = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canCollect = hasPermission('payments_process');
  const activeBranches = branches.filter(branch => branch.is_active);
  const branchName = (id: string | null) => branches.find(branch => branch.id === id)?.name ?? 'غير منسوب لفرع';
  const [terminalId, setTerminalId] = useState('');
  const [params] = useSearchParams();
  const [invoiceId, setInvoiceId] = useState(() => params.get('invoice') ?? '');
  const [search, setSearch] = useState(() => params.get('number') ?? '');
  const [method, setMethod] = useState('cash');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('1');
  const [reference, setReference] = useState('');
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const [receiptId, setReceiptId] = useState('');
  const [opening, setOpening] = useState('');
  const [counted, setCounted] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [assignBranch, setAssignBranch] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [terminalName, setTerminalName] = useState('');
  const [configBranch, setConfigBranch] = useState('');
  const [configAccount, setConfigAccount] = useState('');
  const [transferSource, setTransferSource] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [transferRequest, setTransferRequest] = useState(() => crypto.randomUUID());

  const terminals = useQuery({
    queryKey: ['pos', orgId, 'terminals'],
    queryFn: async () => {
      const { data, error } = await db.from('pos_terminals').select('*').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return data as Terminal[];
    },
  });
  const shifts = useQuery({
    queryKey: ['pos', orgId, 'shifts'],
    queryFn: async () => {
      const { data, error } = await db.from('pos_shifts').select('*').eq('organization_id', orgId)
        .order('closed_at', { ascending: false, nullsFirst: true }).order('opened_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data as Shift[];
    },
  });
  const invoices = useQuery({
    queryKey: ['pos', orgId, 'invoices', search],
    queryFn: async () => (await rpc<Invoice[]>('pos_find_invoices', { _org: orgId, _search: search })) ?? [],
  });
  const receipts = useQuery({
    queryKey: ['pos', orgId, 'receipts'],
    queryFn: async () => {
      const { data, error } = await db.from('pos_receipts').select('*').eq('organization_id', orgId)
        .order('created_at', { ascending: false }).limit(40);
      if (error) throw error;
      return data as Receipt[];
    },
  });
  const selectedReceipt = useQuery({
    queryKey: ['pos', orgId, 'receipt', receiptId],
    enabled: !!receiptId,
    queryFn: async () => {
      const { data, error } = await db.from('pos_receipts').select('*').eq('organization_id', orgId).eq('id', receiptId).single();
      if (error) throw error;
      return data as Receipt;
    },
  });

  const terminal = terminals.data?.find(row => row.id === terminalId);
  const shift = shifts.data?.find(row => row.terminal_id === terminalId && !row.closed_at);
  const ownShift = shift?.opened_by === user?.id;
  const invoice = invoices.data?.find(row => row.id === invoiceId);
  const methodConfig = methods.find(row => row.id === method)!;
  const paymentAccounts = accounts.filter(account => account.currency === invoice?.currency && methodConfig.accounts.includes(account.treasury_kind)
    && (!account.sales_branch_id || account.sales_branch_id === terminal?.branch_id));
  const paymentAccount = method === 'cash' ? terminal?.cash_account_id : accountId;
  const validInvoice = !!invoice && !['draft', 'cancelled', 'canceled', 'void'].includes(invoice.status ?? 'draft');
  const eligible = !!terminal?.is_active && validInvoice && canCollect && !!paymentAccount && +amount > 0 && +amount <= invoice!.remaining_amount
    && +rate > 0 && (method === 'cash' ? ownShift : !!reference.trim() && paymentAccounts.some(row => row.id === paymentAccount));
  const operation = useMutation({
    mutationFn: async ({ name, args }: { name: string; args: Record<string, unknown> }) => rpc<string>(name, { _org: orgId, ...args }),
    onSuccess: (result, { name }) => {
      if (name === 'pos_collect') {
        setReceiptId(result ?? '');
        setAmount(''); setReference(''); setRequest(crypto.randomUUID());
      }
      if (name === 'pos_open_shift') setOpening('');
      if (name === 'pos_close_shift') { setCounted(''); setClosingNote(''); }
      if (name === 'pos_request_refund') { setRefundAmount(''); setRefundReason(''); }
      if (name === 'pos_save_terminal') setTerminalName('');
      if (name === 'pos_transfer_cash') { setTransferAmount(''); setTransferRef(''); setTransferRequest(crypto.randomUUID()); }
      for (const key of [['pos', orgId], ['treasury-accounts', orgId], ['org-members', orgId], ['invoices'], ['refund-requests', orgId], ['refund-balances', orgId]]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      toast.success(name === 'pos_request_refund' ? 'تم إنشاء طلب الاسترداد' : 'تم الحفظ');
    },
    onError: (error: { message?: string }) => toast.error(error.message || 'تعذر تنفيذ العملية'),
  });
  const run = (name: string, args: Record<string, unknown>) => operation.mutate({ name, args });
  const busy = operation.isPending;
  const receipt = selectedReceipt.data;
  const receiptCustomer = receipt?.customer_name || 'عميل';

  return (
    <div dir="rtl" className="space-y-5 p-4 md:p-6">
      <PageHeader title="نقطة البيع" icon={ReceiptText} description="تحصيل الفواتير وإدارة ورديات النقدية" />
      {(terminals.isError || shifts.isError || invoices.isError || receipts.isError || accountsError) &&
        <p role="alert" className="text-destructive">تعذر تحميل بعض بيانات نقطة البيع.</p>}
      <Tabs defaultValue="cashier">
        <TabsList className="print:hidden">
          <TabsTrigger value="cashier">التحصيل والورديات</TabsTrigger>
          {manager && <TabsTrigger value="settings">الإعدادات</TabsTrigger>}
          {hasPermission('financial_view') && <TabsTrigger value="reports">تقارير الفروع</TabsTrigger>}
        </TabsList>
        <TabsContent value="cashier" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 print:hidden">
            <Card>
              <CardHeader><CardTitle>نقطة البيع والوردية</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <label className="block text-sm">نقطة البيع
                  <select className="mt-1 w-full rounded border bg-background p-2" value={terminalId} onChange={event => {
                    setTerminalId(event.target.value); setAccountId(''); setOpening(''); setCounted(''); setClosingNote('');
                  }}>
                    <option value="">اختار نقطة البيع</option>
                    {terminals.data?.filter(row => row.is_active).map(row => <option key={row.id} value={row.id}>{row.name} · {branchName(row.branch_id)}</option>)}
                  </select>
                </label>
                {terminal && !shift && canCollect && <form className="flex items-end gap-2" onSubmit={event => {
                  event.preventDefault(); run('pos_open_shift', { _terminal: terminal.id, _opening: Number(opening) });
                }}>
                  <label className="text-sm">النقد في بداية الوردية<Input type="number" min="0" step=".01" required value={opening} onChange={event => setOpening(event.target.value)} /></label>
                  <Button disabled={busy}>فتح الوردية</Button>
                </form>}
                {shift && <p className="text-sm">وردية مفتوحة · رصيد الافتتاح {money(shift.opening_cash)} {shift.currency}{!ownShift && ' · مفتوحة بواسطة موظف آخر'}</p>}
                {shift && (ownShift || manager) && <form className="space-y-2" onSubmit={event => {
                  event.preventDefault(); run('pos_close_shift', { _shift: shift.id, _counted: Number(counted), _note: closingNote });
                }}>
                  <label className="block text-sm">النقد المعدود عند الإقفال<Input type="number" min="0" step=".01" required value={counted} onChange={event => setCounted(event.target.value)} /></label>
                  <label className="block text-sm">ملاحظة الإقفال<Input value={closingNote} onChange={event => setClosingNote(event.target.value)} placeholder="مطلوبة في حالة وجود فرق" /></label>
                  <Button variant="outline" disabled={busy}>إقفال الوردية</Button>
                </form>}
                {shifts.data?.filter(row => row.terminal_id === terminalId && row.closed_at).slice(0, 8).map(row => (
                  <div key={row.id} className="rounded border p-2 text-sm">
                    {new Date(row.closed_at!).toLocaleString('ar-EG')} · المتوقع {money(row.expected_cash)} · المعدود {money(row.counted_cash)} · الفرق {money(Number(row.counted_cash) - Number(row.expected_cash))} {row.currency}
                    {row.variance_reviewed_at && <p>تمت مراجعة الفرق</p>}
                    {manager && row.counted_cash !== row.expected_cash && !row.variance_reviewed_at && (
                      <div className="mt-2 flex gap-2">
                        <Input aria-label="نتيجة مراجعة فرق الوردية" value={reviewNotes[row.id] ?? ''} onChange={event => setReviewNotes({ ...reviewNotes, [row.id]: event.target.value })} />
                        <Button variant="outline" disabled={busy || !reviewNotes[row.id]?.trim()} onClick={() => run('pos_review_shift', { _shift: row.id, _note: reviewNotes[row.id] })}>تمت المراجعة</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2"><CardTitle>تحصيل فاتورة</CardTitle>
                <Link className="text-sm text-primary underline" to="/bookings">الحجوزات</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input aria-label="البحث عن فاتورة" placeholder="رقم الفاتورة أو الحجز أو اسم العميل" value={search} onChange={event => { setSearch(event.target.value); setInvoiceId(''); }} />
                <select aria-label="الفاتورة" className="w-full rounded border bg-background p-2" value={invoiceId} onChange={event => { setInvoiceId(event.target.value); setAmount(''); setAccountId(''); setAssignBranch(''); setRate('1'); }}>
                  <option value="">اختار الفاتورة</option>
                  {invoices.data?.map(row => <option key={row.id} value={row.id}>{row.invoice_number} · {row.customer_name || row.booking_number} · {branchName(row.sales_branch_id)}</option>)}
                </select>
                {invoice && <p className="text-sm">المستحق {money(invoice.remaining_amount)} {invoice.currency} · {branchName(invoice.sales_branch_id)} · <Link className="text-primary underline" to={`/invoices?id=${invoice.id}`}>فتح الفاتورة</Link></p>}
                {invoice && manager && !invoice.sales_branch_id && <div className="flex gap-2">
                  <BranchSelect branches={activeBranches} value={assignBranch} setValue={setAssignBranch} label="تحديد فرع البيع" />
                  <Button variant="outline" disabled={busy || !assignBranch} onClick={() => run('pos_set_document_branch', { _invoice: invoice.id, _branch: assignBranch })}>حفظ الفرع</Button>
                </div>}
                <form className="space-y-3" onSubmit={event => {
                  event.preventDefault();
                  if (eligible) run('pos_collect', { _request: request, _terminal: terminalId, _invoice: invoiceId,
                    _account: paymentAccount, _amount: Number(amount), _method: method, _rate: Number(rate), _reference: reference });
                }}>
                  <select aria-label="وسيلة الدفع" className="w-full rounded border bg-background p-2" value={method} onChange={event => { setMethod(event.target.value); setAccountId(''); }}>
                    {methods.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
                  </select>
                  {method !== 'cash' && <>
                    <AccountSelect accounts={paymentAccounts} value={accountId} setValue={setAccountId} label="حساب التحصيل" />
                    <Input aria-label="مرجع التحصيل المؤكد" placeholder="مرجع التحصيل المؤكد" required value={reference} onChange={event => setReference(event.target.value)} />
                  </>}
                  {method === 'cash' && terminal && !ownShift && <p className="text-sm text-muted-foreground">افتح ورديتك لتحصيل الكاش.</p>}
                  <label className="block text-sm">مبلغ الدفعة<Input type="number" min=".01" step=".01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
                  {invoice && invoice.currency !== 'EGP' && <label className="block text-sm">سعر الصرف إلى الجنيه<Input type="number" min=".000001" step="any" required value={rate} onChange={event => setRate(event.target.value)} /></label>}
                  <Button disabled={busy || !eligible}>تسجيل التحصيل</Button>
                  {invoice && <Button type="button" variant="outline" disabled={busy || invoice.remaining_amount <= 0}
                    onClick={() => setAmount(String(invoice.remaining_amount))}>المبلغ المتبقي</Button>}
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="print:hidden">
            <CardHeader><CardTitle>أحدث الإيصالات</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {!receipts.data?.length && <p className="text-sm text-muted-foreground">لا توجد إيصالات بعد.</p>}
              {receipts.data?.map(row => <Button key={row.id} variant="outline" size="sm" onClick={() => { setReceiptId(row.id); setRefundAmount(''); setRefundReason(''); }}>{row.invoice_number} · {money(row.amount)} {row.currency}</Button>)}
            </CardContent>
          </Card>
          {receipt && <Card id="pos-print-receipt">
            <CardHeader><CardTitle>إيصال تحصيل</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>رقم الإيصال <span dir="ltr">{receipt.id}</span></p>
              <p>الفاتورة {receipt.invoice_number} · {receiptCustomer}</p>
              <p>{money(receipt.amount)} {receipt.currency} · {methods.find(row => row.id === receipt.method)?.label}</p>
              <p>{new Date(receipt.created_at).toLocaleString('ar-EG')}</p>
              {receipt.reference && <p>مرجع التحصيل {receipt.reference}</p>}
              <Button size="sm" className="print:hidden" onClick={() => window.print()}>طباعة الإيصال</Button>
              {canCollect && hasPermission('payments_refund') && <form className="grid gap-2 sm:grid-cols-3 print:hidden" onSubmit={event => {
                event.preventDefault(); run('pos_request_refund', { _receipt: receipt.id, _amount: Number(refundAmount), _reason: refundReason });
              }}>
                <Input type="number" min=".01" max={receipt.amount} step=".01" required aria-label="مبلغ الاسترداد" placeholder="مبلغ الاسترداد" value={refundAmount} onChange={event => setRefundAmount(event.target.value)} />
                <Input required aria-label="سبب الاسترداد" placeholder="سبب الاسترداد" value={refundReason} onChange={event => setRefundReason(event.target.value)} />
                <Button variant="outline" disabled={busy}>طلب استرداد</Button>
                <Link to="/finance-approvals" className="text-primary underline">متابعة طلبات الاسترداد</Link>
              </form>}
            </CardContent>
          </Card>}
          <style>{`@media print { body:has(#pos-print-receipt) * { visibility: hidden; } #pos-print-receipt, #pos-print-receipt * { visibility: visible; } #pos-print-receipt { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none; } }`}</style>
        </TabsContent>

        {manager && <TabsContent value="settings" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>نقاط البيع</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Link to="/treasury" className="text-sm text-primary underline">ربط الخزينة بالفرع</Link>
              <form className="space-y-2" onSubmit={event => {
                event.preventDefault(); run('pos_save_terminal', { _id: null, _branch: configBranch, _account: configAccount, _name: terminalName, _active: true });
              }}>
                <Input aria-label="اسم نقطة البيع" placeholder="اسم نقطة البيع" value={terminalName} required maxLength={120} onChange={event => setTerminalName(event.target.value)} />
                <BranchSelect branches={activeBranches} value={configBranch} setValue={value => { setConfigBranch(value); setConfigAccount(''); }} label="فرع نقطة البيع" />
                <AccountSelect accounts={accounts.filter(row => row.treasury_kind === 'cash' && row.sales_branch_id === configBranch)} value={configAccount} setValue={setConfigAccount} label="الخزينة النقدية" />
                <Button disabled={busy || !configBranch || !configAccount || !terminalName.trim()}>إضافة نقطة بيع</Button>
              </form>
              {terminals.data?.map(row => <div className="flex items-center justify-between gap-2 border-t pt-2 text-sm" key={row.id}>
                <span>{row.name} · {branchName(row.branch_id)}</span>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run('pos_save_terminal', {
                  _id: row.id, _branch: row.branch_id, _account: row.cash_account_id, _name: row.name, _active: !row.is_active,
                })}>{row.is_active ? 'إيقاف' : 'تفعيل'}</Button>
              </div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>فروع الموظفين</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {members.filter(member => !['owner','admin'].includes(member.role)).map(member => (
                <div className="grid items-center gap-2 sm:grid-cols-2" key={member.id}>
                  <span className="text-sm">{member.profile?.full_name || member.profile?.email || member.user_id}</span>
                  <BranchSelect branches={activeBranches} value={member.branch_id ?? ''} label="فرع الموظف" disabled={busy}
                    setValue={value => run('pos_set_member_branch', { _member: member.id, _branch: value || null })} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>تحويل من خزينة الفرع للإدارة</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-2" onSubmit={event => {
                event.preventDefault(); run('pos_transfer_cash', { _request: transferRequest, _source: transferSource,
                  _target: transferTarget, _amount: Number(transferAmount), _reference: transferRef });
              }}>
                <AccountSelect accounts={accounts.filter(row => row.sales_branch_id && row.treasury_kind === 'cash')} value={transferSource}
                  setValue={value => { setTransferSource(value); setTransferTarget(''); }} label="خزينة الفرع" />
                <AccountSelect accounts={accounts.filter(row => !row.sales_branch_id && ['bank','cash'].includes(row.treasury_kind)
                  && row.currency === accounts.find(account => account.id === transferSource)?.currency)} value={transferTarget} setValue={setTransferTarget} label="الحساب المركزي" />
                <Input type="number" min=".01" step=".01" required aria-label="مبلغ التحويل" placeholder="مبلغ التحويل" value={transferAmount} onChange={event => setTransferAmount(event.target.value)} />
                <Input required aria-label="مرجع التحويل" placeholder="مرجع التحويل" value={transferRef} onChange={event => setTransferRef(event.target.value)} />
                <Button disabled={busy || !transferSource || !transferTarget}>تسجيل التحويل</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>}
        {hasPermission('financial_view') && <TabsContent value="reports"><BranchReports orgId={orgId} branchName={branchName} /></TabsContent>}
      </Tabs>
    </div>
  );
}

function BranchSelect({ branches, value, setValue, label, disabled }: {
  branches: { id: string; name: string }[]; value: string; setValue: (value: string) => void; label: string; disabled?: boolean;
}) {
  return <select aria-label={label} className="w-full rounded border bg-background p-2" value={value} disabled={disabled} onChange={event => setValue(event.target.value)}>
    <option value="">{label}</option>
    {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
  </select>;
}

function AccountSelect({ accounts, value, setValue, label }: {
  accounts: { id: string; account_name: string; currency: string }[]; value: string; setValue: (value: string) => void; label: string;
}) {
  return <select aria-label={label} className="w-full rounded border bg-background p-2" value={value} onChange={event => setValue(event.target.value)}>
    <option value="">{label}</option>
    {accounts.map(row => <option key={row.id} value={row.id}>{row.account_name} · {row.currency}</option>)}
  </select>;
}

function BranchReports({ orgId, branchName }: { orgId: string; branchName: (id: string | null) => string }) {
  const [from, setFrom] = useState(() => localDate().slice(0, 7) + '-01');
  const [to, setTo] = useState(() => localDate());
  const reports = useQuery({
    queryKey: ['pos', orgId, 'reports', from, to],
    enabled: !!from && !!to && from <= to,
    queryFn: async () => {
      const args = { _org: orgId, _from: from, _to: to };
      const [sales, collections, profits] = await Promise.all([
        rpc<{ branch_id: string | null; currency: string; booking_count: number; sales: number; outstanding: number }[]>('pos_sales_report', args),
        rpc<{ branch_id: string; account_name: string; cashier: string; method: string; currency: string; collected: number }[]>('pos_collection_report', args),
        rpc<{ branch_id: string; currency: string; revenue: number; expenses: number; profit: number }[]>('pos_profit_report', args),
      ]);
      return { sales: sales ?? [], collections: collections ?? [], profits: profits ?? [] };
    },
  });
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3">
      <label>من<Input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label>إلى<Input type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
    </div>
    {reports.isError && <p role="alert" className="text-destructive">تعذر تحميل التقارير.</p>}
    {reports.isLoading && <p>جاري التحميل…</p>}
    {reports.data && <>
      <Report title="المبيعات حسب فرع البيع" headers={['الفرع','العملة','الحجوزات','المبيعات','متبقي الفواتير']}
        rows={reports.data.sales.map(row => [branchName(row.branch_id),row.currency,money(row.booking_count),money(row.sales),money(row.outstanding)])} />
      <Report title="تحصيلات نقطة البيع" headers={['فرع التحصيل','الحساب','المحصّل','الوسيلة','العملة','المحصّل فعليًا']}
        rows={reports.data.collections.map(row => [branchName(row.branch_id),row.account_name,row.cashier,methods.find(method => method.id === row.method)?.label ?? row.method,row.currency,money(row.collected)])} />
      <Report title="الربحية حسب مراكز تكلفة الفروع" headers={['الفرع','العملة','الإيرادات','التكاليف والمصروفات','الربح']}
        rows={reports.data.profits.map(row => [branchName(row.branch_id),row.currency,money(row.revenue),money(row.expenses),money(row.profit)])} />
    </>}
  </div>;
}

function Report({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent className="overflow-x-auto">
      {rows.length ? <table className="w-full text-right text-sm">
        <thead><tr>{headers.map(header => <th key={header} className="whitespace-nowrap p-2">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="border-t">{row.map((cell, column) => <td key={column} className="whitespace-nowrap p-2">{cell}</td>)}</tr>)}</tbody>
      </table> : <p className="text-sm text-muted-foreground">لا توجد بيانات في الفترة.</p>}
    </CardContent>
  </Card>;
}
