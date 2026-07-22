import { useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, Download, RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useTrialBalance } from '@/hooks/useFinancialReports';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

const typeLabel: Record<string, string> = {
  asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات',
};

export default function TrialBalance() {
  usePageTitle('ميزان المراجعة');
  const orgId = useOrgId();
  const today = new Date().toISOString().slice(0, 10);
  const [endDate, setEndDate] = useState(today);
  const { data: rows = [], isLoading, refetch } = useTrialBalance(endDate);

  const totals = useMemo(() => {
    const d = rows.reduce((s, r) => s + Number(r.total_debit || 0), 0);
    const c = rows.reduce((s, r) => s + Number(r.total_credit || 0), 0);
    return { d, c, diff: Math.abs(d - c) };
  }, [rows]);

  const backfill = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('no org');
      const { data, error } = await (supabase.rpc as any)('backfill_journals', { _org_id: orgId });
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (r) => {
      toast.success(`تمت الترحيل: فواتير ${r?.invoices_posted || 0}، سداد موردين ${r?.supplier_payments_posted || 0}، مصروفات ${r?.expenses_posted || 0}، دفعات عملاء ${r?.customer_payments_posted || 0}`);
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportCSV = () => {
    const header = ['الحساب', 'الاسم', 'النوع', 'مدين', 'دائن', 'الرصيد'];
    const lines = rows.map(r => [r.account_code, r.account_name_ar || r.account_name, typeLabel[r.account_type], r.total_debit, r.total_credit, r.balance].join(','));
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trial-balance-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <PageHeader icon={Scale} title="ميزان المراجعة" description="أرصدة كل الحسابات حتى تاريخ محدد — يجب أن يتوازن المدين مع الدائن" />

      <Card>
        <CardContent className="pt-6 flex items-end gap-3 flex-wrap">
          <div><Label>حتى تاريخ</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <Button variant="outline" onClick={() => backfill.mutate()} disabled={backfill.isPending}>
            <RefreshCw className={`h-4 w-4 ml-2 ${backfill.isPending ? 'animate-spin' : ''}`} />
            ترحيل السجلات القديمة إلى الأستاذ
          </Button>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 ml-2" />تصدير CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">إجمالي المدين</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{fmt(totals.d)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">إجمالي الدائن</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{fmt(totals.c)}</p></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-sm">الفرق</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold font-mono ${totals.diff < 0.01 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(totals.diff)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الحسابات</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground text-center py-6">جارٍ التحميل…</p> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد حركات.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>الكود</TableHead><TableHead>الاسم</TableHead><TableHead>النوع</TableHead>
                <TableHead className="text-left">مدين</TableHead>
                <TableHead className="text-left">دائن</TableHead>
                <TableHead className="text-left">الرصيد</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.account_id}>
                    <TableCell className="font-mono text-xs">{r.account_code}</TableCell>
                    <TableCell>{r.account_name_ar || r.account_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{typeLabel[r.account_type]}</Badge></TableCell>
                    <TableCell className="text-left font-mono">{Number(r.total_debit) > 0 ? fmt(r.total_debit) : '—'}</TableCell>
                    <TableCell className="text-left font-mono">{Number(r.total_credit) > 0 ? fmt(r.total_credit) : '—'}</TableCell>
                    <TableCell className="text-left font-mono font-semibold">{fmt(r.balance)}</TableCell>
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
