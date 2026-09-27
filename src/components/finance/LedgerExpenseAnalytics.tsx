import { useId, useState } from 'react';
import { format } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useIncomeStatementV2 } from '@/hooks/useFinancialReports';
import { useOrgId } from '@/hooks/useOrgId';
import { expenseSectionLabels, summarizeExpenseLedger } from '@/lib/expenseLedgerAnalytics';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fmt = (value: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export default function LedgerExpenseAnalytics() {
  const orgId = useOrgId();
  const filterId = useId();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`);
  const [end, setEnd] = useState(today);
  const [currency, setCurrency] = useState('EGP');
  const invalidPeriod = !start || !end || start > end;
  const { data: rows = [], isPending, isFetching, error, refetch } = useIncomeStatementV2(start, end, currency);

  if (!orgId) return <p role="status">اختر شركة لعرض التحليلات المالية.</p>;

  const renderReport = () => {
    if (invalidPeriod) return <p role="alert" className="text-destructive">حدد تاريخ البداية والنهاية؛ يجب ألا تكون البداية بعد النهاية.</p>;
    if (isPending || isFetching) return <p role="status">جارٍ تحميل حسابات الفترة…</p>;
    if (error) return (
      <div role="alert" className="space-y-3">
        <p className="text-destructive">تعذر تحميل التحليلات. تحقق من الاتصال وصلاحية قراءة التقارير ثم أعد المحاولة.</p>
        <Button variant="outline" onClick={() => { void refetch(); }}>إعادة المحاولة</Button>
      </div>
    );

    let report: ReturnType<typeof summarizeExpenseLedger>;
    try {
      report = summarizeExpenseLedger(rows, currency);
    } catch {
      return <p role="alert" className="text-destructive">تعذر عرض التقرير لعدم تطابق المبالغ أو العملات. راجع بيانات التقرير.</p>;
    }
    if (report.accounts.length === 0) return <p role="status">لا توجد أرصدة مصروفات مطابقة للفترة والعملة في الحسابات النشطة.</p>;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'مصروفات التشغيل', value: report.operatingTotal },
            { label: 'تكلفة الخدمات', value: report.costOfSalesTotal },
            { label: 'إجمالي المصروفات والتكلفة', value: report.total },
          ].map(metric => (
            <div key={metric.label} className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-xl font-bold tabular-nums">{fmt(metric.value)} <span className="text-xs">{currency}</span></p>
            </div>
          ))}
        </div>
        <div role="img" aria-label={`صافي المصروفات حسب كود الحساب، بالعملة ${currency}. القيم التفصيلية في الجدول التالي.`}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.accounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="account_code" />
              <YAxis />
              <Tooltip formatter={value => [`${fmt(Number(value))} ${currency}`, 'صافي المصروفات']} />
              <ReferenceLine y={0} stroke="currentColor" />
              <Bar dataKey="amount" name="صافي المصروفات" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>كود الحساب</TableHead><TableHead>الحساب</TableHead><TableHead>القسم</TableHead><TableHead>صافي المبلغ ({currency})</TableHead></TableRow></TableHeader>
          <TableBody>
            {report.accounts.map(row => (
              <TableRow key={row.account_id}>
                <TableCell className="font-mono">{row.account_code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{expenseSectionLabels[row.section]}</TableCell>
                <TableCell className="tabular-nums">{fmt(row.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-sm text-muted-foreground">المبلغ هو صافي المدين ناقص الدائن. القيم السالبة تخفّض المصروفات؛ التقرير لا يقيس المدفوعات النقدية.</p>
      </div>
    );
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>تحليل المصروفات المرحّلة</CardTitle>
        <p className="text-sm text-muted-foreground">من القيود المرحّلة للحسابات النشطة في قائمة الدخل، حسب الشركة والفترة والعملة المختارة. لا يجري تحويل العملات.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1"><Label htmlFor={`${filterId}-start`}>من</Label><Input id={`${filterId}-start`} type="date" value={start} max={end || undefined} onChange={event => setStart(event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${filterId}-end`}>إلى</Label><Input id={`${filterId}-end`} type="date" value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} /></div>
          <ReportCurrencySelect value={currency} onValueChange={setCurrency} />
        </div>
        <p className="text-sm text-muted-foreground">فترة التحليل: {start || 'غير محددة'} إلى {end || 'غير محددة'} · العملة: {currency}</p>
        {renderReport()}
        <p className="text-sm text-muted-foreground">مقارنات الميزانية والتوقعات غير متاحة حاليًا؛ يلزم توفير ميزانية معتمدة وطريقة حساب واضحة.</p>
      </CardContent>
    </Card>
  );
}
