import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDecideApproval, useDepartmentKpis, useSopCompliance, useSopRealtime } from '@/hooks/useSop';
import { APPROVAL_LABELS, type SopApprovalType } from '@/lib/sop';
import { usePageTitle } from '@/hooks/usePageTitle';

const SECTION_LABELS: Record<string, string> = {
  unowned_leads: 'ملفات بلا مسؤول',
  incomplete_intake: 'بيانات استقبال ناقصة',
  ack_sla_breaches: 'تجاوز مهلة استلام الإسناد',
  incomplete_handovers: 'تسليمات غير مكتملة',
  requote_required: 'مطلوب إعادة تسعير',
  stuck_leads: 'ملفات متوقفة',
  overdue_deadlines: 'مواعيد تشغيلية متأخرة',
  overdue_incidents: 'شكاوى متأخرة',
};

const KPI_LABELS: Record<string, string> = {
  leads_received: 'ملفات مستلمة',
  avg_first_response_minutes: 'متوسط أول رد (دقيقة)',
  intake_completion_rate: 'اكتمال بيانات الاستقبال %',
  handover_completion_rate: 'اكتمال التسليم %',
  assigned: 'ملفات مُسندة',
  won: 'محجوز',
  lost: 'مفقود',
  conversion_rate: 'نسبة التحويل %',
  avg_ack_minutes: 'متوسط الاستلام (دقيقة)',
  pricing_requests: 'طلبات تسعير',
  avg_pricing_hours: 'متوسط زمن التسعير (ساعة)',
  recheck_change_rate: 'نسبة تغير السعر عند إعادة التأكد %',
  options_avg: 'متوسط عدد الخيارات',
};

const SopCompliance = () => {
  usePageTitle('الالتزام بدليل العمل ومؤشرات الأداء');
  useSopRealtime();
  const { data: report } = useSopCompliance();
  const { data: kpis } = useDepartmentKpis();
  const decide = useDecideApproval();

  const sections = Object.entries(SECTION_LABELS);
  const totalIssues = sections.reduce((s, [k]) => s + (((report as any)?.[k] as any[])?.length || 0), 0);

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الالتزام بدليل العمل</h1>
          <p className="text-sm text-muted-foreground">مخالفات مفتوحة ومؤشرات أداء الأقسام</p>
        </div>
        <Badge variant={totalIssues ? 'destructive' : 'secondary'}>{totalIssues} بند يحتاج معالجة</Badge>
      </header>

      <Tabs defaultValue="compliance">
        <TabsList>
          <TabsTrigger value="compliance">المخالفات</TabsTrigger>
          <TabsTrigger value="approvals">موافقات الإدارة</TabsTrigger>
          <TabsTrigger value="kpis">مؤشرات الأداء</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="grid gap-4 md:grid-cols-2 mt-4">
          {sections.map(([key, label]) => {
            const rows = ((report as any)?.[key] as any[]) || [];
            return (
              <Card key={key}>
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm">{label}</CardTitle>
                  <Badge variant={rows.length ? 'destructive' : 'outline'}>{rows.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  {rows.slice(0, 8).map((r, i) => (
                    <div key={r.id || i} className="border rounded p-2 flex justify-between gap-2">
                      <span>{r.contact_name || r.title || r.deadline_type || r.handover_type || r.id?.slice(0, 8)}</span>
                      <span className="text-muted-foreground">
                        {r.stage || r.status || (r.due_at ? new Date(r.due_at).toLocaleDateString('ar-EG') : '')}
                      </span>
                    </div>
                  ))}
                  {!rows.length && <p className="text-muted-foreground">لا توجد مخالفات.</p>}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">طلبات بانتظار قرار الإدارة</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(report?.pending_approvals || []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between border rounded p-2 text-xs gap-2">
                  <div>
                    <div className="font-medium">{APPROVAL_LABELS[a.approval_type as SopApprovalType] || a.approval_type}</div>
                    <div className="text-muted-foreground">{a.reason || '—'} {a.amount ? `· ${Number(a.amount).toLocaleString()}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => decide.mutate({ approvalId: a.id, approve: true })}>
                      موافقة
                    </Button>
                    <Button
                      size="sm" variant="destructive"
                      onClick={() => decide.mutate({ approvalId: a.id, approve: false, note: window.prompt('سبب الرفض') || '' })}
                    >
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
              {!report?.pending_approvals?.length && (
                <p className="text-xs text-muted-foreground">لا توجد طلبات معلقة.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis" className="grid gap-4 md:grid-cols-3 mt-4">
          {(['customer_service', 'sales', 'reservations'] as const).map((dept) => (
            <Card key={dept}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {dept === 'customer_service' ? 'خدمة العملاء' : dept === 'sales' ? 'المبيعات' : 'الحجوزات'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {Object.entries(kpis?.[dept] || {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b py-1">
                    <span className="text-muted-foreground">{KPI_LABELS[k] || k}</span>
                    <span className="font-medium">{Number(v).toLocaleString()}</span>
                  </div>
                ))}
                {!kpis && <p className="text-muted-foreground">جاري التحميل…</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SopCompliance;
