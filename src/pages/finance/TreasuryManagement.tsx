import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Plus } from 'lucide-react';
import { ListLoadError } from '@/components/common/ListLoadError';
import { TreasuryReceiptReview } from '@/components/finance/TreasuryReceiptReview';
import { CashTreasuryCounts } from '@/components/finance/CashTreasuryCounts';
import TreasuryTransferDialog, { type TreasuryTransfer } from '@/components/finance/TreasuryTransferDialog';
import type { Database } from '@/integrations/supabase/types';
import { formatMoney } from '@/lib/customerMetrics';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { toast } from '@/hooks/use-toast';
import { useTreasuryAccounts } from '@/hooks/finance/useFinanceRpcs';

const KINDS = {
  bank: 'حسابات بنكية',
  cash: 'خزائن نقدية',
  card: 'بطاقات',
  wallet: 'محافظ',
  gateway: 'بوابات دفع',
};
type AccountKind = keyof typeof KINDS;
type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];
const accountKinds = Object.keys(KINDS) as AccountKind[];

export default function TreasuryManagement() {
  usePageTitle('إدارة الخزينة');
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { dir } = useLanguage();
  const { hasPermission, getPermissionScope } = useSupabasePermissions();
  const canTransfer = hasPermission('banking_transfer') && getPermissionScope('banking_transfer') === 'organization';
  const canCount = hasPermission('banking_transactions') && getPermissionScope('banking_transactions') === 'organization';
  const canReviewReceipts = hasPermission('financial_view') && getPermissionScope('financial_view') === 'organization';
  const canReviewDeposits = hasPermission('invoices_view') && getPermissionScope('invoices_view') === 'organization';
  const accountsQuery = useTreasuryAccounts();
  const accounts: BankAccount[] = accountsQuery.data ?? [];
  const transfersQuery = useQuery({
    queryKey: ['treasury-transfers', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<TreasuryTransfer[]>('list_company_treasury_transfers', { _org: orgId });
      if (error) throw error;
      return data ?? [];
    },
  });
  const transfers = transfersQuery.data ?? [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    account_name: '', bank_name: '', account_number: '', currency: 'EGP',
    treasury_kind: 'bank', current_balance: 0, notes: '',
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('bank_accounts').insert({
        ...form, organization_id: orgId, is_active: true, account_type: 'current',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
      setOpen(false);
      toast({ title: 'تمت إضافة الحساب' });
    },
    onError: (error) => toast({ title: 'فشل', description: error.message, variant: 'destructive' }),
  });

  const totalsByKind: Partial<Record<AccountKind, Record<string, number>>> = {};
  for (const account of accounts) {
    const kind = (account.treasury_kind || 'bank') as AccountKind;
    const currency = account.currency;
    if (!accountKinds.includes(kind) || !currency || !/^[A-Z]{3}$/.test(currency)) continue;
    const totals = totalsByKind[kind] ??= {};
    totals[currency] = (totals[currency] ?? 0) + Math.round((account.current_balance ?? 0) * 100);
  }

  return (
    <div className="space-y-4 p-4" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader icon={Wallet} title="إدارة الخزينة" description="الحسابات البنكية، النقدية، البطاقات، المحافظ، وبوابات الدفع" />
        <div className="flex flex-wrap gap-2">
          {orgId && canTransfer && <TreasuryTransferDialog key={orgId} orgId={orgId} accounts={accounts} />}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="me-2 h-4 w-4" />إضافة حساب</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>حساب جديد</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>نوع الحساب</Label>
                  <Select value={form.treasury_kind} onValueChange={(v) => setForm({ ...form, treasury_kind: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{accountKinds.map(kind => <SelectItem key={kind} value={kind}>{KINDS[kind]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>الاسم</Label><Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} /></div>
                <div><Label>البنك / الجهة</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
                <div><Label>رقم الحساب</Label><Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></div>
                <div>
                  <Label>العملة</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['EGP','USD','EUR','SAR','AED','GBP'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>الرصيد الافتتاحي</Label><Input type="number" value={form.current_balance} onChange={(e) => setForm({ ...form, current_balance: Number(e.target.value) })} /></div>
                <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || !form.account_name}>حفظ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {accountKinds.map(kind => {
          const totals = Object.entries(totalsByKind[kind] ?? {}).sort(([a], [b]) => a.localeCompare(b));
          return (
            <Card key={kind}>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{KINDS[kind]}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {totals.length === 0 ? <p className="text-muted-foreground">—</p> : totals.map(([currency, cents]) => (
                  <p key={currency} className="text-lg font-bold"><bdi>{formatMoney(cents / 100, currency)}</bdi></p>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">الحسابات</CardTitle></CardHeader>
        <CardContent>
          {accountsQuery.isLoading ? <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div> :
            accountsQuery.isError ? <ListLoadError message="تعذّر تحميل الحسابات" retry={() => void accountsQuery.refetch()} pending={accountsQuery.isFetching} /> :
            accounts.length === 0 ? <div className="text-center py-8 text-muted-foreground">لا توجد حسابات</div> :
            <Table>
              <TableHeader><TableRow>
                <TableHead>النوع</TableHead><TableHead>الاسم</TableHead>
                <TableHead>البنك</TableHead><TableHead>الرقم</TableHead>
                <TableHead>العملة</TableHead><TableHead className="text-end">الرصيد</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><Badge variant="outline">{KINDS[(a.treasury_kind || 'bank') as AccountKind] ?? a.treasury_kind}</Badge></TableCell>
                    <TableCell className="font-medium">{a.account_name}</TableCell>
                    <TableCell>{a.bank_name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.account_number}</TableCell>
                    <TableCell><Badge>{a.currency || '—'}</Badge></TableCell>
                    <TableCell className="text-end font-mono"><bdi>{(a.current_balance ?? 0).toLocaleString('ar-EG')}</bdi></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>

      {orgId && <CashTreasuryCounts key={orgId} orgId={orgId} accounts={accounts} canRecord={canCount} />}
      {orgId && canReviewReceipts && <TreasuryReceiptReview key={`receipt-review-${orgId}-${canReviewDeposits}`} orgId={orgId}
        canViewBookings={hasPermission('bookings_view')} canViewInvoices={hasPermission('invoices_view')} canReviewDeposits={canReviewDeposits} />}

      <Card>
        <CardHeader><CardTitle className="text-base">أحدث التحويلات الداخلية</CardTitle></CardHeader>
        <CardContent>
          {transfersQuery.isLoading ? (
            <p className="py-6 text-center text-muted-foreground">جارٍ التحميل…</p>
          ) : transfersQuery.isError ? (
            <ListLoadError message="تعذّر تحميل التحويلات الداخلية" retry={() => void transfersQuery.refetch()} pending={transfersQuery.isFetching} />
          ) : transfers.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">لا توجد تحويلات داخلية مسجلة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>من حساب</TableHead>
                  <TableHead>إلى حساب</TableHead>
                  <TableHead className="text-end">المبلغ</TableHead>
                  <TableHead>رقم القيد</TableHead>
                  <TableHead>رقم الإيصال</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(transfer => (
                  <TableRow key={transfer.id}>
                    <TableCell className="whitespace-nowrap"><bdi>{transfer.transfer_date}</bdi></TableCell>
                    <TableCell>{transfer.from_account_name}</TableCell>
                    <TableCell>{transfer.to_account_name}</TableCell>
                    <TableCell className="whitespace-nowrap text-end font-medium"><bdi>{formatMoney(transfer.amount, transfer.currency)}</bdi></TableCell>
                    <TableCell>
                      <Link className="font-mono text-primary underline underline-offset-2" to={`/journal-entries?entry=${transfer.journal_entry_id}`}>
                        <bdi>{transfer.reference_number}</bdi>
                      </Link>
                    </TableCell>
                    <TableCell><bdi>{transfer.receipt_reference || '—'}</bdi></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
