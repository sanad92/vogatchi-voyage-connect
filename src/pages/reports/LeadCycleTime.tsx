import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCcw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useLeadAuditRealtime, useLeadCycleReport, type LeadCycleFilters } from '@/hooks/useLeadAudit';
import LeadAuditTimeline from '@/components/sop/LeadAuditTimeline';
import { actionLabel, formatDuration, KPI_LABELS } from '@/lib/leadAudit';
import { DEPARTMENT_LABELS, LEAD_STAGE_LABELS, type SopDepartment, type SopLeadStage } from '@/lib/sop';

const ALL = '__all__';
const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const STAGE_COLUMNS: { key: keyof any; label: string }[] = [
  { key: 'first_response_minutes', label: 'أول رد' },
  { key: 'wait_sales_claim_minutes', label: 'انتظار المبيعات' },
  { key: 'sales_handling_minutes', label: 'تعامل المبيعات' },
  { key: 'reservations_queue_minutes', label: 'طابور الحجوزات' },
  { key: 'pricing_turnaround_minutes', label: 'إنجاز التسعير' },
  { key: 'decision_minutes', label: 'قرار العميل' },
  { key: 'recheck_minutes', label: 'إعادة التحقق' },
  { key: 'total_minutes', label: 'إجمالي حتى الحجز' },
];

const LeadCycleTime = () => {
  usePageTitle('زمن دورة العميل — تقرير الإدارة');
  useLeadAuditRealtime();
  const { members } = useOrgMembers();

  const [fromDate, setFromDate] = useState(isoDaysAgo(90));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState<string>(ALL);
  const [employee, setEmployee] = useState<string>(ALL);
  const [stage, setStage] = useState<string>(ALL);
  const [source, setSource] = useState('');
  const [outcome, setOutcome] = useState<string>(ALL);
  const [includeLegacy, setIncludeLegacy] = useState(false);
  const [openLead, setOpenLead] = useState<string | null>(null);

  const filters: LeadCycleFilters = useMemo(() => ({
    from: new Date(`${fromDate}T00:00:00`).toISOString(),
    to: new Date(`${toDate}T23:59:59`).toISOString(),
    department: department === ALL ? null : (department as SopDepartment),
    employee: employee === ALL ? null : employee,
    stage: stage === ALL ? null : (stage as SopLeadStage),
    source: source.trim() || null,
    outcome: outcome === ALL ? null : (outcome as 'booked' | 'lost' | 'open'),
    includeLegacy,
  }), [fromDate, toDate, department, employee, stage, source, outcome, includeLegacy]);

  const { data, isLoading, refetch, isFetching } = useLeadCycleReport(filters);
  const leads = data?.leads || [];

  const exportCsv = () => {
    const headers = ['lead_number', 'contact_name', 'stage', 'owner_name', 'lead_source',
      ...STAGE_COLUMNS.map((c) => String(c.key))];
    const rows = leads.map((l: any) => headers.map((h) => {
      const v = l[h];
      return v === null || v === undefined ? '' : String(v).replace(/"/g, '""');
    }));
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-cycle-time-${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">زمن دورة العميل</h1>
          <p className="text-sm text-muted-foreground">
            توقيتات دقيقة لكل مرحلة من دخول العميل حتى تأكيد الحجز
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="h-4 w-4 ml-1" /> تحديث
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!leads.length}>
            <Download className="h-4 w-4 ml-1" /> تصدير CSV
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-3 pt-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">القسم</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل الأقسام</SelectItem>
                {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الموظف</Label>
            <Select value={employee} onValueChange={setEmployee}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل الموظفين</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.user_id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">المرحلة</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>كل المراحل</SelectItem>
                {Object.entries(LEAD_STAGE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">المصدر</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="مثال: whatsapp" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">النتيجة</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>الكل</SelectItem>
                <SelectItem value="booked">محجوز</SelectItem>
                <SelectItem value="lost">مفقود / ملغي</SelectItem>
                <SelectItem value="open">مفتوح</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={includeLegacy} onCheckedChange={setIncludeLegacy} id="legacy" />
            <Label htmlFor="legacy" className="text-xs">تضمين السجلات التاريخية</Label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="kpis">
          <TabsList>
            <TabsTrigger value="kpis">مؤشرات الزمن</TabsTrigger>
            <TabsTrigger value="leads">تفاصيل العملاء ({leads.length})</TabsTrigger>
            <TabsTrigger value="employees">أداء الموظفين</TabsTrigger>
          </TabsList>

          <TabsContent value="kpis" className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(KPI_LABELS).map(([key, label]) => {
                const k = data?.kpis?.[key];
                return (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center justify-between gap-2">
                        <span>{label}</span>
                        <Badge variant="outline" className="text-[10px]">{k?.count || 0} ملف</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">المتوسط</span><span className="font-medium">{formatDuration(k?.avg)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">الوسيط</span><span className="font-medium">{formatDuration(k?.median)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">P90</span><span className="font-medium">{formatDuration(k?.p90)}</span></div>
                      {!!k?.sla && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تجاوز SLA ({formatDuration(k.sla)})</span>
                          <Badge variant={k.breached ? 'destructive' : 'outline'} className="text-[10px]">{k.breached}</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">تغطية البيانات التاريخية</CardTitle></CardHeader>
              <CardContent className="text-xs grid gap-2 md:grid-cols-4">
                <div>عدد الملفات: <span className="font-medium">{data?.coverage?.leads ?? 0}</span></div>
                <div>لها سجل زمني: <span className="font-medium">{data?.coverage?.with_history ?? 0}</span></div>
                <div>نسبة التغطية: <span className="font-medium">{data?.coverage?.coverage_percent ?? 0}%</span></div>
                <div>تسعير بدون نتيجة: <span className="font-medium">{data?.coverage?.missing_pricing ?? 0}</span></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-4">
            <Card>
              <CardContent className="pt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العميل</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>المسؤول</TableHead>
                      {STAGE_COLUMNS.map((c) => <TableHead key={String(c.key)}>{c.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((l: any) => (
                      <TableRow
                        key={l.lead_id}
                        className="cursor-pointer"
                        onClick={() => setOpenLead(l.lead_id)}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="font-medium">{l.contact_name || '—'}</div>
                          <div className="text-[10px] text-muted-foreground">{l.lead_number}</div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{LEAD_STAGE_LABELS[l.stage as SopLeadStage]}</Badge></TableCell>
                        <TableCell className="text-xs">{l.owner_name || '—'}</TableCell>
                        {STAGE_COLUMNS.map((c) => (
                          <TableCell key={String(c.key)} className="text-xs whitespace-nowrap">
                            {formatDuration(l[c.key as string])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {!leads.length && (
                      <TableRow><TableCell colSpan={3 + STAGE_COLUMNS.length} className="text-center text-xs text-muted-foreground">لا توجد بيانات ضمن الفلاتر المحددة.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="mt-4">
            <Card>
              <CardContent className="pt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الإجراء</TableHead>
                      <TableHead>عدد المرات</TableHead>
                      <TableHead>متوسط الزمن من دخول العميل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.employees || []).map((e, i) => (
                      <TableRow key={`${e.actor_user_id}-${e.action}-${i}`}>
                        <TableCell className="text-xs">{e.actor_name || e.actor_user_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs">{actionLabel(e.action)}</TableCell>
                        <TableCell className="text-xs">{e.actions}</TableCell>
                        <TableCell className="text-xs">{formatDuration(e.avg_minutes_from_entry)}</TableCell>
                      </TableRow>
                    ))}
                    {!data?.employees?.length && (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">لا توجد بيانات.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!openLead} onOpenChange={(o) => !o && setOpenLead(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>السجل الزمني للملف</DialogTitle></DialogHeader>
          <LeadAuditTimeline leadId={openLead} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadCycleTime;
