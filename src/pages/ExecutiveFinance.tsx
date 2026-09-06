import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownLeft, ArrowUpLeft, ArrowUpRight, BadgeDollarSign,
  ArrowDownToLine, ArrowUpFromLine, BriefcaseBusiness, CheckCircle2,
  CircleDollarSign, HandCoins, Loader2, TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/layout/PageHeader';
import ReportCurrencySelect from '@/components/finance/ReportCurrencySelect';
import { useExecutiveKpis, type ExecutiveKpiDashboard, type ExecutiveKpiGroup } from '@/hooks/useExecutiveKpis';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';

const currentDate = new Date();
const today = currentDate.toISOString().slice(0, 10);
const yearStart = `${currentDate.getFullYear()}-01-01`;
const monthStart = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
const typeNames: Record<string, string> = { hotel: 'فنادق', flight: 'طيران', transport: 'انتقالات', car_rental: 'سيارات', other: 'أخرى' };

const money = (value: number, currency: string) => new Intl.NumberFormat('ar-EG', {
  style: 'currency', currency, maximumFractionDigits: 0,
}).format(Number(value || 0));

export default function ExecutiveFinance() {
  usePageTitle('لوحة مؤشرات الإدارة التنفيذية');
  const orgId = useOrgId();
  const [start, setStart] = useState(yearStart);
  const [end, setEnd] = useState(today);
  const [currency, setCurrency] = useState('EGP');
  const { data, isLoading, error, refetch } = useExecutiveKpis(orgId, start, end, currency);

  const setPeriod = (kind: 'month' | 'year') => {
    setStart(kind === 'month' ? monthStart : yearStart);
    setEnd(today);
  };

  return (
    <div className="space-y-5 p-4 md:p-6" dir="rtl">
      <PageHeader
        icon={CircleDollarSign}
        title="لوحة مؤشرات الإدارة التنفيذية"
        description="المبيعات والربحية والتسويات وأهم نقاط التدخل من مصدر مالي موحد."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} /></div>
          <div className="space-y-1"><Label>إلى تاريخ</Label><Input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} /></div>
          <ReportCurrencySelect value={currency} onValueChange={setCurrency} />
          <Button variant="outline" onClick={() => setPeriod('month')}>الشهر الحالي</Button>
          <Button variant="outline" onClick={() => setPeriod('year')}>من بداية السنة</Button>
          <Button variant="ghost" onClick={() => void refetch()}>تحديث</Button>
        </CardContent>
      </Card>

      {start > end && <Alert variant="destructive"><AlertTitle>الفترة غير صحيحة</AlertTitle><AlertDescription>تاريخ البداية يجب أن يسبق تاريخ النهاية.</AlertDescription></Alert>}
      {isLoading && <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />جاري حساب مؤشرات الإدارة...</div>}
      {error && <Alert variant="destructive"><AlertTitle>تعذر تحميل المؤشرات</AlertTitle><AlertDescription>{error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'}</AlertDescription></Alert>}
      {data && <Dashboard data={data} currency={currency} />}
    </div>
  );
}

const Dashboard = ({ data, currency }: { data: ExecutiveKpiDashboard; currency: string }) => {
  const s = data.summary;
  const chartData = data.monthly.map((row) => ({
    ...row,
    label: new Date(row.month).toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' }),
  }));
  const cards: Array<{ title: string; value: number; icon: LucideIcon; tone?: 'good' | 'bad' | 'warn'; note?: string }> = [
    { title: 'إجمالي المبيعات', value: s.selling, icon: BadgeDollarSign, tone: 'good' },
    { title: 'تكلفة الموردين', value: s.supplier_cost, icon: HandCoins },
    { title: 'إجمالي الربح', value: s.gross_profit, icon: TrendingUp, tone: s.gross_profit >= 0 ? 'good' : 'bad', note: `هامش ${s.gross_margin_pct.toFixed(1)}%` },
    { title: 'صافي المساهمة', value: s.net_contribution, icon: CircleDollarSign, tone: s.net_contribution >= 0 ? 'good' : 'bad', note: `بعد ${money(s.direct_expenses + s.commissions, currency)} مصروفات وعمولات` },
    { title: 'المحصل من العملاء', value: s.customer_collected, icon: ArrowDownToLine, tone: 'good' },
    { title: 'متبقي على العملاء', value: s.customer_remaining, icon: Users, tone: s.customer_remaining > 0 ? 'bad' : 'good' },
    { title: 'المدفوع للموردين', value: s.supplier_paid, icon: ArrowUpFromLine, tone: 'good' },
    { title: 'متبقي للموردين', value: s.supplier_remaining, icon: BriefcaseBusiness, tone: s.supplier_remaining > 0 ? 'warn' : 'good' },
  ];

  return <>
    <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>كل الأرقام تخص حجوزات الفترة المختارة وبعملة <strong>{currency}</strong> فقط، ومصدر الربحية هو نفس محرك ربحية الحجز والتسويات.</AlertDescription></Alert>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => <KpiCard key={card.title} {...card} value={money(card.value, currency)} />)}
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">اتجاه المبيعات وصافي المساهمة</CardTitle></CardHeader>
        <CardContent className="h-72">
          {chartData.length === 0 ? <Empty /> : <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value: number) => money(value, currency)} /><Legend />
            <Bar dataKey="selling" name="المبيعات" fill="hsl(var(--primary) / 0.35)" radius={[4, 4, 0, 0]} />
            <Line dataKey="net_contribution" name="صافي المساهمة" stroke="hsl(var(--primary))" strokeWidth={3} />
          </ComposedChart></ResponsiveContainer>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">اكتمال الحجوزات ماليًا</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center"><p className="text-4xl font-bold">{s.financial_completion_pct.toFixed(1)}%</p><p className="text-xs text-muted-foreground">{s.financially_complete_count} من {s.bookings_count} حجز مؤكد</p></div>
          <Progress value={s.financial_completion_pct} className="h-3" />
          <div className="grid grid-cols-3 gap-2 text-center text-sm"><Count label="مؤكد" value={s.confirmed_count} /><Count label="معلق" value={s.pending_count} /><Count label="ملغي" value={s.cancelled_count} /></div>
          <div className="flex justify-between rounded-md bg-muted p-3 text-sm"><span>حجوزات تحتاج تدخل</span><strong className={s.financially_open_count > 0 ? 'text-destructive' : ''}>{s.financially_open_count}</strong></div>
          <div className="flex justify-between rounded-md bg-muted p-3 text-sm"><span>حجوزات خاسرة</span><strong className={s.loss_bookings_count > 0 ? 'text-destructive' : ''}>{s.loss_bookings_count}</strong></div>
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      <Comparison title="تغير المبيعات" current={s.selling} previous={data.comparison.previous_selling} change={data.comparison.selling_change_pct} currency={currency} period={`${data.filters.previous_start_date} — ${data.filters.previous_end_date}`} />
      <Comparison title="تغير صافي المساهمة" current={s.net_contribution} previous={data.comparison.previous_net_contribution} change={data.comparison.net_change_pct} currency={currency} period={`${data.filters.previous_start_date} — ${data.filters.previous_end_date}`} />
    </div>

    <Card>
      <CardHeader><CardTitle className="text-base">تحليل الأداء ونقاط التدخل</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="attention">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="attention">تحتاج تدخل ({data.attention_bookings.length})</TabsTrigger><TabsTrigger value="type">نوع الحجز</TabsTrigger><TabsTrigger value="employee">الموظفون</TabsTrigger><TabsTrigger value="customer">العملاء</TabsTrigger><TabsTrigger value="supplier">الموردون</TabsTrigger>
          </TabsList>
          <TabsContent value="attention"><AttentionTable rows={data.attention_bookings} currency={currency} /></TabsContent>
          <TabsContent value="type"><GroupTable rows={data.by_type.map((row) => ({ ...row, name: typeNames[row.name] || row.name }))} currency={currency} /></TabsContent>
          <TabsContent value="employee"><GroupTable rows={data.by_employee} currency={currency} /></TabsContent>
          <TabsContent value="customer"><GroupTable rows={data.by_customer} currency={currency} /></TabsContent>
          <TabsContent value="supplier"><GroupTable rows={data.by_supplier} currency={currency} showCost /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </>;
};

const KpiCard = ({ title, value, note, icon: Icon, tone }: { title: string; value: string; note?: string; icon: LucideIcon; tone?: 'good' | 'bad' | 'warn' }) => {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-destructive' : tone === 'warn' ? 'text-amber-600' : '';
  return <Card><CardContent className="flex items-start justify-between gap-3 pt-5"><div><p className="text-xs text-muted-foreground">{title}</p><p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>{note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}</div><div className="rounded-lg bg-muted p-2"><Icon className={`h-5 w-5 ${color}`} /></div></CardContent></Card>;
};

const Comparison = ({ title, current, previous, change, currency, period }: { title: string; current: number; previous: number; change: number | null; currency: string; period: string }) => {
  const positive = change !== null && change >= 0;
  return <Card><CardContent className="flex items-center justify-between gap-3 pt-5"><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">الفترة السابقة: {period}</p><p className="mt-2 text-xs text-muted-foreground">{money(previous, currency)} ← {money(current, currency)}</p></div><div className={`flex items-center gap-1 text-lg font-bold ${change === null ? 'text-muted-foreground' : positive ? 'text-emerald-600' : 'text-destructive'}`}>{change === null ? '—' : <>{positive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}{Math.abs(change).toFixed(1)}%</>}</div></CardContent></Card>;
};

const GroupTable = ({ rows, currency, showCost = false }: { rows: ExecutiveKpiGroup[]; currency: string; showCost?: boolean }) => <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>التصنيف</TableHead><TableHead>الحجوزات</TableHead><TableHead>المبيعات</TableHead>{showCost && <TableHead>تكلفة المورد</TableHead>}<TableHead>صافي المساهمة</TableHead><TableHead>الهامش</TableHead></TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={`${row.id || row.name}-${index}`}><TableCell className="font-medium">{row.name}</TableCell><TableCell>{row.booking_count}</TableCell><TableCell>{money(row.selling, currency)}</TableCell>{showCost && <TableCell>{money(row.supplier_cost || 0, currency)}</TableCell>}<TableCell className={row.net_contribution < 0 ? 'text-destructive' : 'text-emerald-600'}>{money(row.net_contribution, currency)}</TableCell><TableCell>{row.margin_pct.toFixed(1)}%</TableCell></TableRow>)}{rows.length === 0 && <TableRow><TableCell colSpan={showCost ? 6 : 5}><Empty /></TableCell></TableRow>}</TableBody></Table></div>;

const AttentionTable = ({ rows, currency }: { rows: ExecutiveKpiDashboard['attention_bookings']; currency: string }) => <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>الحجز</TableHead><TableHead>العميل / المورد</TableHead><TableHead>صافي المساهمة</TableHead><TableHead>رصيد العميل</TableHead><TableHead>رصيد المورد</TableHead><TableHead>السبب</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-medium">{row.booking_number}</p><p className="text-xs text-muted-foreground">{typeNames[row.booking_type || 'other'] || row.booking_type}</p></TableCell><TableCell><p>{row.customer_name}</p><p className="text-xs text-muted-foreground">{row.supplier_name}</p></TableCell><TableCell className={row.net_contribution < 0 ? 'text-destructive' : ''}>{money(row.net_contribution, currency)}</TableCell><TableCell className={row.customer_remaining > 0 ? 'text-destructive' : ''}>{money(row.customer_remaining, currency)}</TableCell><TableCell className={row.supplier_remaining > 0 ? 'text-amber-600' : ''}>{money(row.supplier_remaining, currency)}</TableCell><TableCell className="max-w-64"><div className="flex flex-wrap gap-1">{row.warnings.slice(0, 2).map((warning) => <Badge key={warning} variant="outline" className="whitespace-normal text-[10px]"><AlertTriangle className="ml-1 h-3 w-3" />{warning}</Badge>)}{row.warnings.length === 0 && <span className="text-xs text-muted-foreground">تسوية مالية مفتوحة</span>}</div></TableCell><TableCell><Button asChild variant="ghost" size="sm"><Link to={`/bookings/${row.id}/workspace?tab=financials`}>فتح<ArrowUpLeft className="mr-1 h-4 w-4" /></Link></Button></TableCell></TableRow>)}{rows.length === 0 && <TableRow><TableCell colSpan={7}><Empty label="لا توجد حجوزات تحتاج تدخل في الفترة." /></TableCell></TableRow>}</TableBody></Table></div>;

const Count = ({ label, value }: { label: string; value: number }) => <div><p className="text-lg font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
const Empty = ({ label = 'لا توجد بيانات في الفترة المختارة.' }: { label?: string }) => <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">{label}</div>;
