import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Calculator, CircleAlert, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformFinanceRole } from '@/hooks/usePlatformFinanceRole';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TablePager, PAGE_SIZE, PLATFORM_TABLE_CONTAINER } from '@/components/platform-admin/TablePager';
import type { Tables } from '@/integrations/supabase/types';

const kinds: Record<string, string> = {
  asset: 'أصول', liability: 'التزامات', equity: 'حقوق ملكية', income: 'إيرادات', expense: 'مصروفات',
};
const sources: Record<string, string> = {
  manual: 'يدوي', bank_transfer: 'تحويل بنكي', paymob: 'Paymob', reversal: 'قيد عكسي',
};
const roles: Record<string, string> = { accountant: 'محاسب المنصة', auditor: 'مراجع مالي' };

function today() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function displayError(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error && 'code' in error ? error.code : null;
  if (code === '42501') return 'صلاحياتك الحالية لا تسمح بهذا الإجراء.';
  return fallback;
}

type Account = Tables<'platform_finance_accounts'>;
type DraftLine = { id: string; account: string; side: 'debit' | 'credit'; amount: string };
const newLine = (side: DraftLine['side']): DraftLine => ({ id: crypto.randomUUID(), account: '', side, amount: '' });
const freshDraft = (currency: string) => ({ id: crypto.randomUUID(), currency, date: today(), memo: '', lines: [newLine('debit'), newLine('credit')] });
const cents = (value: string) => /^\d{1,11}(\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : 0;

function Status({ loading, error, empty, retry }: { loading?: boolean; error?: boolean; empty?: string; retry?: () => void }) {
  if (loading) return <p role="status" className="py-5 text-sm text-muted-foreground">جارٍ تحميل البيانات</p>;
  if (error) return (
    <div role="alert" className="flex flex-wrap items-center gap-2 py-5 text-sm text-destructive">
      <CircleAlert className="h-4 w-4" aria-hidden="true" /> تعذّر تحميل البيانات
      {retry && <Button type="button" size="sm" variant="outline" onClick={retry}>إعادة المحاولة</Button>}
    </div>
  );
  return empty ? <p className="py-5 text-sm text-muted-foreground">{empty}</p> : null;
}

function Staff() {
  const qc = useQueryClient();
  const { user } = useOptimizedAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('accountant');
  const staff = useQuery({
    queryKey: ['platform-finance', user?.id, 'staff'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_platform_finance_staff');
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string | null }) => {
      const { error } = await supabase.rpc('set_platform_finance_staff', { p_email: email, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-finance', user?.id, 'staff'] });
      qc.invalidateQueries({ queryKey: ['platform-finance-role'] });
      setEmail('');
      toast.success('تم تحديث صلاحية الحسابات');
    },
    onError: (error) => toast.error(displayError(error, 'تعذّر تحديث الصلاحية. تأكد من البريد ومن تفعيل الحساب.')),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">صلاحيات حسابات المنصة</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">امنح الصلاحية لبريد حساب مسجّل ومؤكّد. المحاسب يرحّل القيود والمراجع يطّلع عليها.</p>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ email: email.trim(), role }); }}>
          <div className="space-y-1.5">
            <Label htmlFor="finance-staff-email">البريد الإلكتروني</Label>
            <Input id="finance-staff-email" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="finance-staff-role">الدور</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="finance-staff-role" className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(roles).map(([value, name]) => <SelectItem key={value} value={value}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button disabled={save.isPending || !email.trim()} type="submit">حفظ الصلاحية</Button>
        </form>
        <Status loading={staff.isLoading} error={staff.isError} empty={staff.data?.length === 0 ? 'لا توجد صلاحيات مالية إضافية.' : undefined} retry={() => staff.refetch()} />
        {!!staff.data?.length && <ul className="divide-y divide-border">
          {staff.data.map((row) => (
            <li className="flex flex-wrap items-center gap-3 py-2 text-sm" key={row.email}>
              <bdi className="min-w-0 break-all" data-no-translate>{row.email}</bdi>
              <span className="text-muted-foreground">{roles[row.role]}</span>
              <Button className="ms-auto text-destructive" variant="ghost" size="sm" disabled={save.isPending}
                onClick={() => save.mutate({ email: row.email, role: null })}>إلغاء الصلاحية</Button>
            </li>
          ))}
        </ul>}
      </CardContent>
    </Card>
  );
}

function AddAccount({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const empty = { p_code: '', p_name_ar: '', p_name_en: '', p_kind: 'expense' };
  const [form, setForm] = useState(empty);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('add_platform_finance_account', form);
      if (error) throw error;
    },
    onSuccess: () => {
      onAdded();
      setOpen(false);
      setForm(empty);
      toast.success('تمت إضافة الحساب');
    },
    onError: (error) => toast.error(displayError(error, 'تعذّرت إضافة الحساب. تأكد من أن الرمز غير مستخدم.')),
  });
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><Plus aria-hidden="true" />إضافة حساب</Button>
      <Dialog open={open} onOpenChange={(value) => { if (!save.isPending) setOpen(value); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>إضافة حساب إلى الدليل</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            {([
              ['p_code', 'رمز الحساب'],
              ['p_name_ar', 'اسم الحساب بالعربية'],
              ['p_name_en', 'اسم الحساب بالإنجليزية'],
            ] as const).map(([key, label]) => (
              <div className="space-y-1.5" key={key}><Label htmlFor={key}>{label}</Label>
                <Input id={key} dir={key === 'p_name_ar' ? 'rtl' : 'ltr'} value={form[key]} required
                  pattern={key === 'p_code' ? '[0-9]{4,8}' : undefined} maxLength={key === 'p_code' ? 8 : 100}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="space-y-1.5"><Label htmlFor="new-account-kind">نوع الحساب</Label>
              <Select value={form.p_kind} onValueChange={(p_kind) => setForm({ ...form, p_kind })}>
                <SelectTrigger id="new-account-kind"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(kinds).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="submit" disabled={save.isPending}>حفظ الحساب</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PlatformFinance() {
  const { role } = usePlatformFinanceRole();
  const { user } = useOptimizedAuth();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const canPost = role === 'owner' || role === 'accountant';
  const accountName = (account: Account | undefined) => account ? (language === 'en' ? account.name_en : account.name_ar) : '';
  const formatAmount = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format;
  const [currency, setCurrency] = useState('EGP');
  const [from, setFrom] = useState(() => today().slice(0, 7) + '-01');
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(1);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [reverseNote, setReverseNote] = useState('');
  const [draft, setDraft] = useState<ReturnType<typeof freshDraft> | null>(null);
  const filtersValid = Boolean(from && to && from <= to && /^[A-Z]{3}$/.test(currency));
  const scope = ['platform-finance', user?.id];
  const accounts = useQuery({
    queryKey: [...scope, 'accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_finance_accounts').select('*').order('code');
      if (error) throw error;
      return data;
    },
  });
  const journal = useQuery({
    queryKey: [...scope, 'journal', currency, from, to, page],
    enabled: filtersValid,
    queryFn: async ({ signal }) => {
      const offset = (page - 1) * PAGE_SIZE;
      const { data, count, error } = await supabase.from('platform_finance_entries')
        .select('id, entry_no, entry_date, memo, source, source_id, reverses_id, posted_at', { count: 'exact' })
        .eq('currency', currency).gte('entry_date', from).lte('entry_date', to)
        .order('entry_date', { ascending: false }).order('entry_no', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
      if (error) throw error;
      if (!data || count === null) throw new Error('Missing journal data');
      return { rows: data, count };
    },
  });
  const trial = useQuery({
    queryKey: [...scope, 'balance', currency, from, to],
    enabled: filtersValid,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('platform_finance_trial_balance', {
        p_from: from, p_to: to, p_currency: currency,
      }).abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
  });
  const detail = useQuery({
    queryKey: [...scope, 'entry', entryId],
    enabled: !!entryId,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('platform_finance_lines').select('*')
        .eq('entry_id', entryId!).order('line_no').abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const selectedEntry = journal.data?.rows.find((entry) => entry.id === entryId);
  const refresh = () => qc.invalidateQueries({ queryKey: scope });
  const posting = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { error } = await supabase.rpc('post_platform_finance_entry', {
        p_date: draft.date, p_currency: draft.currency, p_memo: draft.memo,
        p_request_id: draft.id,
        p_lines: draft.lines.map((line) => ({
          account_code: line.account,
          debit: line.side === 'debit' ? cents(line.amount) / 100 : 0,
          credit: line.side === 'credit' ? cents(line.amount) / 100 : 0,
        })),
      });
      if (error) throw error;
    },
    onSuccess: () => { setDraft(null); setPage(1); refresh(); toast.success('تم ترحيل القيد'); },
    onError: (error) => toast.error(displayError(error, 'تعذّر ترحيل القيد. راجع الحسابات والمبالغ والتاريخ.')),
  });
  const reversal = useMutation({
    mutationFn: async () => {
      if (!entryId) return;
      const { error } = await supabase.rpc('reverse_platform_finance_entry', { p_entry_id: entryId, p_memo: reverseNote });
      if (error) throw error;
    },
    onSuccess: () => { setEntryId(null); setReverseNote(''); refresh(); toast.success('تم تسجيل القيد العكسي'); },
    onError: (error) => toast.error(displayError(error, 'تعذّر تسجيل القيد العكسي')),
  });
  const paymob = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('import_platform_paymob_receipts', { p_from: from, p_to: to });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      refresh();
      toast.success(count ? `تم استيراد ${count} دفعة Paymob` : 'لا توجد دفعات Paymob جديدة للاستيراد');
    },
    onError: (error) => toast.error(displayError(error, 'تعذّر استيراد الدفعات. اختر فترة لا تتجاوز ٩٣ يومًا وتنتهي اليوم أو قبله.')),
  });

  const draftTotals = draft?.lines.reduce((sum, line) => ({ ...sum, [line.side]: sum[line.side] + cents(line.amount) }), { debit: 0, credit: 0 });
  const canSave = draft && draftTotals && draftTotals.debit > 0 && draftTotals.debit === draftTotals.credit
    && draft.date && draft.memo.trim() && draft.lines.every((line) => line.account && cents(line.amount) > 0);
  const updateLine = (id: string, fields: Partial<DraftLine>) => {
    setDraft((value) => value && { ...value, lines: value.lines.map((line) => line.id === id ? { ...line, ...fields } : line) });
  };
  const balance = trial.data ?? [];
  const income = balance.reduce((sum, row) => accounts.data?.find((a) => a.code === row.account_code)?.kind === 'income' ? sum + Number(row.credit) - Number(row.debit) : sum, 0);
  const expenses = balance.reduce((sum, row) => accounts.data?.find((a) => a.code === row.account_code)?.kind === 'expense' ? sum + Number(row.debit) - Number(row.credit) : sum, 0);
  const showTotals = filtersValid && accounts.isSuccess && trial.isSuccess;
  const pages = Math.max(1, Math.ceil((journal.data?.count ?? 0) / PAGE_SIZE));
  const handlePost = (event: FormEvent) => { event.preventDefault(); if (canSave) posting.mutate(); };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sidebar px-5 py-6 text-sidebar-foreground">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Calculator className="h-6 w-6" aria-hidden="true" />محاسبة SafarERP</h1>
          <p className="mt-2 text-sm text-sidebar-foreground/80">اشتراكات ومصروفات المنصة وسجل القيود المحاسبية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={refresh}><RefreshCw aria-hidden="true" />تحديث البيانات</Button>
          {canPost && <Button variant="secondary" type="button" disabled={!accounts.data?.length || !/^[A-Z]{3}$/.test(currency)}
            onClick={() => setDraft(freshDraft(currency))}><Plus aria-hidden="true" />قيد يومية جديد</Button>}
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5"><Label htmlFor="ledger-from">من تاريخ</Label>
          <Input id="ledger-from" type="date" dir="ltr" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="space-y-1.5"><Label htmlFor="ledger-to">إلى تاريخ</Label>
          <Input id="ledger-to" type="date" dir="ltr" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></div>
        <div className="space-y-1.5"><Label htmlFor="ledger-currency">العملة</Label>
          <Input id="ledger-currency" dir="ltr" className="w-24" maxLength={3} value={currency}
            onChange={(e) => { setCurrency(e.target.value.toUpperCase()); setPage(1); }} /></div>
        {canPost && <Button variant="outline" type="button" onClick={() => paymob.mutate()} disabled={!filtersValid || currency !== 'EGP' || paymob.isPending}>استيراد دفعات Paymob</Button>}
      </div>
      {!filtersValid && <p role="alert" className="text-sm text-destructive">اختر تاريخ بداية ونهاية صالحين ورمز عملة من ٣ أحرف.</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['إيرادات الفترة', income],
          ['مصروفات الفترة', expenses],
          ['صافي الفترة', income - expenses],
        ].map(([label, value]) => (
          <Card key={label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums">{showTotals ? <bdi>{formatAmount(Number(value))} {currency}</bdi> : '—'}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="journal" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="journal">قيود اليومية</TabsTrigger>
          <TabsTrigger value="balance">ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="accounts">دليل الحسابات</TabsTrigger>
          {role === 'owner' && <TabsTrigger value="staff">الصلاحيات المالية</TabsTrigger>}
        </TabsList>
        <TabsContent value="journal">
          <Card><CardContent className="p-4 sm:p-5">
            <Status loading={filtersValid && journal.isLoading} error={journal.isError}
              empty={filtersValid && journal.data?.count === 0 ? 'لا توجد قيود في الفترة المحددة.' : undefined} retry={() => journal.refetch()} />
            {!!journal.data?.rows.length && <Table containerClassName={PLATFORM_TABLE_CONTAINER}>
              <TableHeader><TableRow>
                <TableHead className="text-start">رقم القيد</TableHead><TableHead className="text-start">التاريخ</TableHead>
                <TableHead className="text-start">البيان</TableHead><TableHead className="text-start">المصدر</TableHead>
                <TableHead className="text-start">التفاصيل</TableHead>
              </TableRow></TableHeader>
              <TableBody>{journal.data.rows.map((row) => <TableRow key={row.id}>
                <TableCell><bdi>{row.entry_no}</bdi></TableCell><TableCell><bdi>{row.entry_date}</bdi></TableCell>
                <TableCell className="min-w-44 break-words" data-no-translate>{row.memo}</TableCell>
                <TableCell>{sources[row.source]}</TableCell>
                <TableCell><Button type="button" size="sm" variant="ghost" onClick={() => { setEntryId(row.id); setReverseNote(''); }}>عرض القيد</Button></TableCell>
              </TableRow>)}</TableBody>
            </Table>}
            {pages > 1 && <TablePager page={page} pageCount={pages} total={journal.data?.count ?? 0} onChange={setPage} />}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="balance">
          <Card><CardContent className="p-4 sm:p-5">
            <Status loading={filtersValid && (trial.isLoading || accounts.isLoading)} error={trial.isError || accounts.isError}
              empty={filtersValid && trial.isSuccess && !balance.length ? 'لا توجد حركات في الفترة المحددة.' : undefined} retry={refresh} />
            {!!balance.length && <Table containerClassName={PLATFORM_TABLE_CONTAINER}>
              <TableHeader><TableRow>
                <TableHead className="text-start">الحساب</TableHead>
                <TableHead className="text-end">الرصيد الافتتاحي</TableHead>
                <TableHead className="text-end">حركة مدين</TableHead>
                <TableHead className="text-end">حركة دائن</TableHead>
                <TableHead className="text-end">الرصيد الختامي</TableHead>
              </TableRow></TableHeader>
              <TableBody>{balance.map((row) => {
                const opening = Number(row.opening);
                const closing = opening + Number(row.debit) - Number(row.credit);
                return <TableRow key={row.account_code}>
                  <TableCell><bdi data-no-translate>{row.account_code} · {accountName(accounts.data?.find((a) => a.code === row.account_code))}</bdi></TableCell>
                  <TableCell className="text-end tabular-nums"><bdi>{formatAmount(opening)}</bdi></TableCell>
                  <TableCell className="text-end tabular-nums">{formatAmount(Number(row.debit))}</TableCell>
                  <TableCell className="text-end tabular-nums">{formatAmount(Number(row.credit))}</TableCell>
                  <TableCell className="text-end tabular-nums"><bdi>{formatAmount(closing)}</bdi></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table>}
            {!!balance.length && <p className="mt-3 text-xs text-muted-foreground">الرصيد الموجب مدين والرصيد السالب دائن.</p>}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="accounts">
          <Card><CardContent className="p-4 sm:p-5">
            {role === 'owner' && <div className="mb-3"><AddAccount onAdded={refresh} /></div>}
            <Status loading={accounts.isLoading} error={accounts.isError} retry={() => accounts.refetch()} />
            {accounts.data && <Table containerClassName={PLATFORM_TABLE_CONTAINER}>
              <TableHeader><TableRow><TableHead className="text-start">رمز الحساب</TableHead>
                <TableHead className="text-start">اسم الحساب</TableHead><TableHead className="text-start">نوع الحساب</TableHead>
              </TableRow></TableHeader>
              <TableBody>{accounts.data.map((account) => <TableRow key={account.code}>
                <TableCell>{account.code}</TableCell><TableCell data-no-translate>{accountName(account)}</TableCell>
                <TableCell>{kinds[account.kind]}</TableCell>
              </TableRow>)}</TableBody>
            </Table>}
          </CardContent></Card>
        </TabsContent>
        {role === 'owner' && <TabsContent value="staff"><Staff /></TabsContent>}
      </Tabs>

      <Dialog open={!!draft} onOpenChange={(open) => { if (!open && !posting.isPending) setDraft(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>قيد يومية جديد</DialogTitle></DialogHeader>
          {draft && <form onSubmit={handlePost} className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5"><Label htmlFor="entry-date">تاريخ القيد</Label>
                <Input id="entry-date" dir="ltr" type="date" max={today()} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required /></div>
              <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="entry-memo">البيان</Label>
                <Input id="entry-memo" maxLength={500} value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} required /></div>
              <bdi className="pb-2 text-sm font-semibold">{draft.currency}</bdi>
            </div>
            <div className="space-y-2">
              {draft.lines.map((line) => <div key={line.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <Select value={line.account} onValueChange={(value) => updateLine(line.id, { account: value })}>
                  <SelectTrigger className="min-w-36 flex-1" aria-label="الحساب"><SelectValue placeholder="الحساب" /></SelectTrigger>
                  <SelectContent>{accounts.data?.map((account) => <SelectItem key={account.code} value={account.code}>
                    {account.code} · {accountName(account)}
                  </SelectItem>)}</SelectContent>
                </Select>
                <Select value={line.side} onValueChange={(side: DraftLine['side']) => updateLine(line.id, { side })}>
                  <SelectTrigger className="w-24" aria-label="طرف القيد"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="debit">مدين</SelectItem><SelectItem value="credit">دائن</SelectItem></SelectContent>
                </Select>
                <Input aria-label="المبلغ" className="w-28" dir="ltr" inputMode="decimal" value={line.amount}
                  onChange={(e) => updateLine(line.id, { amount: e.target.value })} />
                <Button type="button" size="icon" variant="ghost" aria-label="حذف السطر" disabled={draft.lines.length <= 2}
                  onClick={() => setDraft({ ...draft, lines: draft.lines.filter((item) => item.id !== line.id) })}><Trash2 aria-hidden="true" /></Button>
              </div>)}
            </div>
            <Button type="button" variant="outline" size="sm" disabled={draft.lines.length >= 50}
              onClick={() => setDraft({ ...draft, lines: [...draft.lines, newLine('debit')] })}><Plus aria-hidden="true" />إضافة سطر</Button>
            <div className="flex flex-wrap gap-3 text-sm tabular-nums">
              <span>مدين <bdi>{formatAmount((draftTotals?.debit ?? 0) / 100)}</bdi></span>
              <span>دائن <bdi>{formatAmount((draftTotals?.credit ?? 0) / 100)}</bdi></span>
            </div>
            <DialogFooter><Button type="submit" disabled={!canPost || !canSave || posting.isPending}>ترحيل القيد</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!entryId} onOpenChange={(open) => { if (!open && !reversal.isPending) setEntryId(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" aria-hidden="true" />تفاصيل القيد <bdi>{selectedEntry?.entry_no}</bdi></DialogTitle></DialogHeader>
          <p className="break-words text-sm" data-no-translate>{selectedEntry?.memo}</p>
          {selectedEntry?.source_id && <p className="text-xs text-muted-foreground">مرجع العملية <bdi className="break-all">{selectedEntry.source_id}</bdi></p>}
          {selectedEntry?.reverses_id && <p className="text-xs text-muted-foreground">مرجع القيد الأصلي <bdi className="break-all">{selectedEntry.reverses_id}</bdi></p>}
          <Status loading={detail.isLoading} error={detail.isError} retry={() => detail.refetch()} />
          {detail.data && <Table containerClassName={PLATFORM_TABLE_CONTAINER}>
            <TableHeader><TableRow><TableHead className="text-start">الحساب</TableHead>
              <TableHead className="text-end">مدين</TableHead><TableHead className="text-end">دائن</TableHead>
            </TableRow></TableHeader>
            <TableBody>{detail.data.map((line) => <TableRow key={line.line_no}>
              <TableCell><bdi data-no-translate>{line.account_code} · {accountName(accounts.data?.find((a) => a.code === line.account_code))}</bdi></TableCell>
              <TableCell className="text-end tabular-nums">{formatAmount(Number(line.debit))}</TableCell>
              <TableCell className="text-end tabular-nums">{formatAmount(Number(line.credit))}</TableCell>
            </TableRow>)}</TableBody>
          </Table>}
          {role === 'owner' && selectedEntry && selectedEntry.source !== 'reversal' && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (reverseNote.trim()) reversal.mutate(); }}>
              <div className="min-w-36 flex-1 space-y-1.5"><Label htmlFor="reversal-note">سبب العكس</Label>
                <Input id="reversal-note" value={reverseNote} maxLength={500} onChange={(e) => setReverseNote(e.target.value)} required /></div>
              <Button type="submit" variant="outline" disabled={!reverseNote.trim() || reversal.isPending}>ترحيل قيد عكسي</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
