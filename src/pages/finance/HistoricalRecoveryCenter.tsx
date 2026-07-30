import { useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  History, Search, Wrench, Scale, Lock, Unlock, Download, AlertTriangle, CheckCircle2, RefreshCw,
} from 'lucide-react';
import {
  RECOVERY_START_DATE, fiscalYears, yearRange,
  useHistoricalGaps, useHistoricalSummary, useRecoveryRuns, useRecoveryItems, useFiscalClosures,
  useRunBackfill, useReplayGL, useFiscalReconciliation, useCloseFiscalYear, useReopenFiscalYear,
  type GapRow,
} from '@/hooks/useHistoricalRecovery';

const nf = (n: any) =>
  new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(Number(n || 0));

const gapLabels: Array<{ key: keyof GapRow; label: string }> = [
  { key: 'missing_invoice', label: 'فاتورة' },
  { key: 'missing_supplier_po', label: 'أمر دفع مورد' },
  { key: 'missing_voucher', label: 'فاوتشر' },
  { key: 'missing_snapshot', label: 'لقطة مالية' },
  { key: 'missing_automation_run', label: 'أتمتة' },
  { key: 'missing_timeline', label: 'خط زمني' },
  { key: 'missing_workflow_history', label: 'سجل المراحل' },
  { key: 'missing_events', label: 'أحداث' },
  { key: 'missing_gl', label: 'قيود دفترية' },
];

const summaryLabels: Record<string, string> = {
  total_bookings: 'إجمالي الحجوزات',
  clean_bookings: 'حجوزات سليمة',
  bookings_with_gaps: 'حجوزات ناقصة',
  missing_invoice: 'بدون فاتورة',
  missing_supplier_po: 'بدون أمر دفع مورد',
  missing_voucher: 'بدون فاوتشر',
  missing_snapshot: 'بدون لقطة مالية',
  missing_automation_run: 'بدون تشغيل أتمتة',
  missing_timeline: 'بدون خط زمني',
  missing_workflow_history: 'بدون سجل مراحل',
  missing_events: 'بدون أحداث',
  missing_gl: 'بدون قيود دفترية',
  no_customer: 'بدون عميل',
  no_supplier: 'بدون مورد',
  zero_price: 'سعر بيع صفري',
  negative_margin: 'هامش سالب',
  orphan_customer_payments: 'دفعات عملاء يتيمة',
  supplier_payments_without_booking: 'دفعات موردين بلا حجز',
  invoices_without_gl: 'فواتير بلا ترحيل',
  unbalanced_journal_entries: 'قيود غير متوازنة',
  failed_event_deliveries: 'أحداث فشل تسليمها',
};

const actionBadge: Record<string, { label: string; variant: any }> = {
  created: { label: 'تم الإنشاء', variant: 'default' },
  would_create: { label: 'محاكاة', variant: 'secondary' },
  skipped: { label: 'تم التخطي', variant: 'outline' },
  verified: { label: 'سليم', variant: 'outline' },
  failed: { label: 'فشل', variant: 'destructive' },
};

export default function HistoricalRecoveryCenter() {
  usePageTitle('مركز الاسترداد التاريخي');
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(RECOVERY_START_DATE);
  const [to, setTo] = useState(today);
  const [auditStarted, setAuditStarted] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [closeYear, setCloseYear] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [reopenYear, setReopenYear] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const gaps = useHistoricalGaps(from, to, auditStarted);
  const summary = useHistoricalSummary(from, to, auditStarted);
  const runs = useRecoveryRuns();
  const items = useRecoveryItems(selectedRun);
  const closures = useFiscalClosures();

  const backfill = useRunBackfill();
  const replay = useReplayGL();
  const reconcile = useFiscalReconciliation();
  const closeYearMut = useCloseFiscalYear();
  const reopenMut = useReopenFiscalYear();

  const rows = gaps.data || [];
  const healthPct = useMemo(() => {
    if (!rows.length) return 0;
    return Math.round((rows.filter((r) => r.gap_count === 0).length / rows.length) * 100);
  }, [rows]);

  const closureByYear = useMemo(() => {
    const map: Record<number, any> = {};
    (closures.data || []).forEach((c) => { map[c.fiscal_year] = c; });
    return map;
  }, [closures.data]);

  const exportCSV = () => {
    const header = ['الحجز', 'التاريخ', 'المرحلة', 'سعر البيع', 'التكلفة', ...gapLabels.map((g) => g.label), 'عدد الفجوات'];
    const lines = rows.map((r) => [
      r.booking_number || r.booking_id, r.created_on, r.workflow_stage, r.selling_price ?? 0, r.cost_price ?? 0,
      ...gapLabels.map((g) => ((r as any)[g.key] ? 'ناقص' : 'موجود')), r.gap_count,
    ].join(','));
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historical-audit-${from}_${to}.csv`;
    a.click();
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <PageHeader
        icon={History}
        title="مركز الاسترداد التاريخي"
        description="تدقيق وإعادة بناء البيانات التاريخية والمحاسبية من 22 مايو 2022 حتى اليوم — كل العمليات آمنة وقابلة للتكرار دون تكرار السجلات"
      />

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>لا يتم إقفال أي سنة مالية تلقائيًا</AlertTitle>
        <AlertDescription>
          يبدأ كل شيء بتدقيق للقراءة فقط. الإصلاح والترحيل يجريان في وضع المحاكاة أولًا، والإقفال يتطلب تأكيدًا صريحًا منك بعد مراجعة تقرير المطابقة.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="audit"><Search className="h-4 w-4 ml-2" />المرحلة 1 — التدقيق</TabsTrigger>
          <TabsTrigger value="backfill"><Wrench className="h-4 w-4 ml-2" />المرحلة 2 — الإصلاح</TabsTrigger>
          <TabsTrigger value="accounting"><Scale className="h-4 w-4 ml-2" />المرحلة 3 — المحاسبة</TabsTrigger>
          <TabsTrigger value="fiscal"><Lock className="h-4 w-4 ml-2" />السنوات المالية</TabsTrigger>
          <TabsTrigger value="log"><History className="h-4 w-4 ml-2" />سجل العمليات</TabsTrigger>
        </TabsList>

        {/* ---------- PHASE 1 ---------- */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نطاق التدقيق</CardTitle>
              <CardDescription>عملية قراءة فقط — لا تُنشئ ولا تُعدّل أي سجل.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div><Label>من تاريخ</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div><Label>إلى تاريخ</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              <Button onClick={() => { setAuditStarted(true); gaps.refetch(); summary.refetch(); }} disabled={gaps.isFetching}>
                <RefreshCw className={`h-4 w-4 ml-2 ${gaps.isFetching ? 'animate-spin' : ''}`} />
                تشغيل التدقيق
              </Button>
              <Button variant="outline" onClick={exportCSV} disabled={!rows.length}>
                <Download className="h-4 w-4 ml-2" />تصدير التقرير
              </Button>
            </CardContent>
          </Card>

          {!auditStarted ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">ابدأ بتشغيل التدقيق لعرض تقرير المطابقة.</CardContent></Card>
          ) : gaps.isLoading ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">جارٍ فحص السجلات…</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">سلامة البيانات</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Progress value={healthPct} />
                  <p className="text-sm text-muted-foreground">
                    {healthPct}% من الحجوزات مكتملة ({rows.filter((r) => r.gap_count === 0).length} من {rows.length})
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(summaryLabels).map(([key, label]) => (
                  <Card key={key}>
                    <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold font-mono">{nf(summary.data?.[key] ?? 0)}</p></CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader><CardTitle>تفاصيل الحجوزات الناقصة</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>الحجز</TableHead><TableHead>التاريخ</TableHead><TableHead>المرحلة</TableHead>
                      <TableHead className="text-left">سعر البيع</TableHead><TableHead>العناصر الناقصة</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {rows.filter((r) => r.gap_count > 0).slice(0, 200).map((r) => (
                        <TableRow key={r.booking_id}>
                          <TableCell className="font-mono text-xs">{r.booking_number || r.booking_id.slice(0, 8)}</TableCell>
                          <TableCell className="text-xs">{r.created_on}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{r.workflow_stage}</Badge></TableCell>
                          <TableCell className="text-left font-mono">{nf(r.selling_price)} {r.currency}</TableCell>
                          <TableCell className="flex flex-wrap gap-1">
                            {gapLabels.filter((g) => (r as any)[g.key]).map((g) => (
                              <Badge key={g.key} variant="destructive" className="text-[10px]">{g.label}</Badge>
                            ))}
                            {r.zero_price && <Badge variant="secondary" className="text-[10px]">سعر صفري</Badge>}
                            {r.no_customer && <Badge variant="secondary" className="text-[10px]">بدون عميل</Badge>}
                            {r.negative_margin && <Badge variant="secondary" className="text-[10px]">هامش سالب</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                      {rows.filter((r) => r.gap_count > 0).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                          <CheckCircle2 className="h-4 w-4 inline ml-1 text-emerald-600" />لا توجد فجوات في هذه الفترة.
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ---------- PHASE 2 ---------- */}
        <TabsContent value="backfill" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعادة بناء السجلات الناقصة</CardTitle>
              <CardDescription>
                يُنشئ فقط ما هو مفقود (فاتورة، أمر دفع مورد، فاوتشر، لقطة مالية، تشغيل أتمتة، خط زمني) ولا يكرر أي سجل قائم.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch id="dry" checked={dryRun} onCheckedChange={setDryRun} />
                <Label htmlFor="dry">وضع المحاكاة (بدون أي تعديل فعلي)</Label>
              </div>
              {!dryRun && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>وضع التنفيذ الفعلي — سيتم إنشاء السجلات الناقصة وتسجيل كل خطوة في سجل العمليات.</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <div><Label>من تاريخ</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div><Label>إلى تاريخ</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
                <Button onClick={() => backfill.mutate({ from, to, dryRun })} disabled={backfill.isPending}>
                  <Wrench className={`h-4 w-4 ml-2 ${backfill.isPending ? 'animate-spin' : ''}`} />
                  {dryRun ? 'تشغيل المحاكاة' : 'تنفيذ الإصلاح'}
                </Button>
              </div>
              {backfill.data && (
                <div className="grid gap-3 sm:grid-cols-5">
                  {[['processed', 'تمت معالجته'], ['created', 'تم إصلاحه'], ['simulated', 'محاكاة'], ['skipped', 'تخطي'], ['failed', 'فشل']].map(([k, l]) => (
                    <Card key={k}><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{l}</CardTitle></CardHeader>
                      <CardContent><p className="text-xl font-bold font-mono">{nf(backfill.data?.[k])}</p></CardContent></Card>
                  ))}
                  <Button variant="link" className="col-span-full justify-start px-0"
                    onClick={() => setSelectedRun(backfill.data?.run_id)}>عرض تفاصيل هذه العملية في السجل</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- PHASE 3 ---------- */}
        <TabsContent value="accounting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعادة ترحيل القيود المحاسبية</CardTitle>
              <CardDescription>يُرحّل فقط الفواتير والمدفوعات والمصروفات غير المرحّلة، ثم يمكنك مراجعة ميزان المراجعة والقوائم المالية.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => replay.mutate({ from, to, dryRun: true })} disabled={replay.isPending}>
                  محاكاة الترحيل
                </Button>
                <Button onClick={() => replay.mutate({ from, to, dryRun: false })} disabled={replay.isPending}>
                  <Scale className="h-4 w-4 ml-2" />تنفيذ الترحيل
                </Button>
              </div>
              {replay.data && (
                <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{JSON.stringify(replay.data, null, 2)}</pre>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild variant="secondary" size="sm"><a href="/trial-balance">ميزان المراجعة</a></Button>
                <Button asChild variant="secondary" size="sm"><a href="/income-statement">قائمة الدخل</a></Button>
                <Button asChild variant="secondary" size="sm"><a href="/balance-sheet">الميزانية العمومية</a></Button>
                <Button asChild variant="secondary" size="sm"><a href="/customer-ledger">أستاذ العملاء</a></Button>
                <Button asChild variant="secondary" size="sm"><a href="/supplier-ledger">أستاذ الموردين</a></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- PHASE 4: FISCAL YEARS ---------- */}
        <TabsContent value="fiscal" className="space-y-4">
          {fiscalYears().map((year) => {
            const c = closureByYear[year];
            const rec = c?.reconciliation || {};
            const range = yearRange(year);
            return (
              <Card key={year}>
                <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      السنة المالية {year}
                      {c?.status === 'closed' && <Badge variant="destructive">مقفلة</Badge>}
                      {c?.status === 'reconciled' && <Badge variant="secondary">تمت المطابقة</Badge>}
                      {!c && <Badge variant="outline">مفتوحة</Badge>}
                    </CardTitle>
                    <CardDescription>{range.start} → {range.end}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => reconcile.mutate(year)} disabled={reconcile.isPending}>
                      تقرير المطابقة
                    </Button>
                    {c?.status === 'closed' ? (
                      <Button size="sm" variant="outline" onClick={() => { setReopenYear(year); setReopenReason(''); }}>
                        <Unlock className="h-4 w-4 ml-2" />إعادة فتح
                      </Button>
                    ) : (
                      <Button size="sm" disabled={!c} onClick={() => { setCloseYear(year); setConfirmText(''); }}>
                        <Lock className="h-4 w-4 ml-2" />إقفال السنة
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {c && (
                  <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 text-sm">
                    <div><p className="text-muted-foreground text-xs">حجوزات ناقصة</p><p className="font-mono font-semibold">{nf(rec?.audit?.bookings_with_gaps)}</p></div>
                    <div><p className="text-muted-foreground text-xs">إيراد الحجوزات</p><p className="font-mono font-semibold">{nf(rec?.operations?.booking_revenue)}</p></div>
                    <div><p className="text-muted-foreground text-xs">إجمالي الفواتير</p><p className="font-mono font-semibold">{nf(rec?.operations?.invoiced_total)}</p></div>
                    <div><p className="text-muted-foreground text-xs">فرق المدين/الدائن</p>
                      <p className={`font-mono font-semibold ${Number(rec?.ledger?.difference || 0) === 0 ? 'text-emerald-600' : 'text-destructive'}`}>{nf(rec?.ledger?.difference)}</p></div>
                    <div><p className="text-muted-foreground text-xs">جاهزة للإقفال</p>
                      <p className="font-semibold">{rec?.ready_to_close ? 'نعم' : 'لا'}</p></div>
                    {c.reopen_reason && <p className="col-span-full text-xs text-muted-foreground">سبب إعادة الفتح: {c.reopen_reason}</p>}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* ---------- LOG ---------- */}
        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>عمليات الاسترداد</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>النوع</TableHead><TableHead>الفترة</TableHead><TableHead>الحالة</TableHead>
                  <TableHead>النتائج</TableHead><TableHead>البدء</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(runs.data || []).map((r) => (
                    <TableRow key={r.id} className={selectedRun === r.id ? 'bg-muted/50' : ''}>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.mode}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{r.from_date} → {r.to_date}</TableCell>
                      <TableCell><Badge variant={r.status === 'completed' ? 'default' : r.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{JSON.stringify(r.totals).slice(0, 90)}</TableCell>
                      <TableCell className="text-xs">{new Date(r.started_at).toLocaleString('ar-EG')}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => setSelectedRun(r.id)}>التفاصيل</Button></TableCell>
                    </TableRow>
                  ))}
                  {!runs.data?.length && (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">لا توجد عمليات بعد.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedRun && (
            <Card>
              <CardHeader><CardTitle>تفاصيل السجلات ({items.data?.length || 0})</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto max-h-[520px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>الحجز</TableHead><TableHead>العنصر</TableHead><TableHead>الإجراء</TableHead><TableHead>ملاحظات</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(items.data || []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-mono text-xs">{it.booking_number || it.booking_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs">{it.entity_type}</TableCell>
                        <TableCell><Badge variant={actionBadge[it.action]?.variant} className="text-[10px]">{actionBadge[it.action]?.label || it.action}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{it.error_message || it.detail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Close confirmation */}
      <Dialog open={closeYear !== null} onOpenChange={(o) => !o && setCloseYear(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد إقفال السنة المالية {closeYear}</DialogTitle>
            <DialogDescription>
              راجع تقرير المطابقة قبل المتابعة. لتأكيد الإقفال اكتب: <span className="font-mono font-bold">CLOSE {closeYear}</span>
            </DialogDescription>
          </DialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={`CLOSE ${closeYear}`} dir="ltr" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseYear(null)}>إلغاء</Button>
            <Button
              disabled={confirmText !== `CLOSE ${closeYear}` || closeYearMut.isPending}
              onClick={() => closeYear && closeYearMut.mutate(
                { year: closeYear, confirmation: confirmText },
                { onSuccess: () => setCloseYear(null) },
              )}
            >
              <Lock className="h-4 w-4 ml-2" />إقفال نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen */}
      <Dialog open={reopenYear !== null} onOpenChange={(o) => !o && setReopenYear(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إعادة فتح السنة المالية {reopenYear}</DialogTitle>
            <DialogDescription>يجب توضيح سبب إعادة الفتح، وسيتم تسجيله في سجل المراجعة.</DialogDescription>
          </DialogHeader>
          <Input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="سبب إعادة الفتح" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenYear(null)}>إلغاء</Button>
            <Button
              disabled={!reopenReason.trim() || reopenMut.isPending}
              onClick={() => reopenYear && reopenMut.mutate(
                { year: reopenYear, reason: reopenReason },
                { onSuccess: () => setReopenYear(null) },
              )}
            >
              <Unlock className="h-4 w-4 ml-2" />إعادة الفتح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
