import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
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
import { toast } from '@/hooks/use-toast';
import { useTreasuryAccounts } from '@/hooks/finance/useFinanceRpcs';

const sb = supabase as any;
const KINDS = ['bank', 'cash', 'card', 'wallet', 'gateway'] as const;

export default function TreasuryManagement() {
  usePageTitle('إدارة الخزينة');
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useTreasuryAccounts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    account_name: '', bank_name: '', account_number: '', currency: 'EGP',
    treasury_kind: 'bank', current_balance: 0, notes: '',
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await sb.from('bank_accounts').insert({
        ...form, organization_id: orgId, is_active: true, account_type: 'current',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
      setOpen(false);
      toast({ title: 'تمت إضافة الحساب' });
    },
    onError: (e: any) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });

  const totalsByKind = accounts.reduce((acc: any, a: any) => {
    const k = a.treasury_kind || 'bank';
    acc[k] = (acc[k] || 0) + Number(a.current_balance || 0);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <PageHeader icon={Wallet} title="إدارة الخزينة" description="الحسابات البنكية، النقدية، البطاقات، المحافظ، وبوابات الدفع" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إضافة حساب</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>حساب جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>نوع الحساب</Label>
                <Select value={form.treasury_kind} onValueChange={(v) => setForm({ ...form, treasury_kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KINDS.map(k => (
          <Card key={k}>
            <CardHeader className="pb-1"><CardTitle className="text-xs uppercase text-muted-foreground">{k}</CardTitle></CardHeader>
            <CardContent><p className="text-lg font-bold">{(totalsByKind[k] || 0).toLocaleString('ar-EG')} EGP</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">الحسابات</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div> :
            accounts.length === 0 ? <div className="text-center py-8 text-muted-foreground">لا توجد حسابات</div> :
            <Table>
              <TableHeader><TableRow>
                <TableHead>النوع</TableHead><TableHead>الاسم</TableHead>
                <TableHead>البنك</TableHead><TableHead>الرقم</TableHead>
                <TableHead>العملة</TableHead><TableHead className="text-left">الرصيد</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {accounts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell><Badge variant="outline">{a.treasury_kind || 'bank'}</Badge></TableCell>
                    <TableCell className="font-medium">{a.account_name}</TableCell>
                    <TableCell>{a.bank_name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.account_number}</TableCell>
                    <TableCell><Badge>{a.currency}</Badge></TableCell>
                    <TableCell className="text-left font-mono">{Number(a.current_balance || 0).toLocaleString('ar-EG')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        </CardContent>
      </Card>
    </div>
  );
}
