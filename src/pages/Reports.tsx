import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useOrgId } from '@/hooks/useOrgId';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { bookingReportCells, bookingReportColumns, bookingServiceLabels, loadBookingReportRows } from '@/lib/reportRows';
import PageHeader from '@/components/layout/PageHeader';
import ReportDownloadButtons from '@/components/export/ReportDownloadButtons';
import SmartAlerts from '@/components/reports/SmartAlerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statuses = { draft: 'مسودة', pending: 'معلق', processing: 'قيد المعالجة', confirmed: 'مؤكد', cancelled: 'ملغي', completed: 'مكتمل', paid: 'مدفوع' };
const pageSize = 25;

export default function Reports() {
  usePageTitle('التقارير');
  const orgId = useOrgId();
  const { currentOrganization } = useOrganization();
  const { hasPermission, getPermissionScope } = useSupabasePermissions();
  const canExport = hasPermission('reports_export') && getPermissionScope('reports_export') === 'organization';
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(`${today.slice(0, 7)}-01`);
  const [end, setEnd] = useState(today);
  const [service, setService] = useState('all');
  const [status, setStatus] = useState('all');
  const [currencyInput, setCurrencyInput] = useState('');
  const [page, setPage] = useState(1);
  const currency = currencyInput.trim().toUpperCase() || 'all';
  const invalid = !start || !end || start > end || (currency !== 'all' && !/^[A-Z]{3}$/.test(currency));
  const permitted = hasPermission('bookings_view') && getPermissionScope('bookings_view') === 'organization';
  const scope = { start, end, service, status, currency };
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['booking-report', orgId, scope],
    enabled: Boolean(orgId && permitted && !invalid),
    queryFn: () => loadBookingReportRows(orgId!, scope),
  });
  const rows = data ?? [];
  const count = rows.length;
  const displayedPage = Math.min(page, Math.ceil(count / pageSize)) || 1;
  const update = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const scopeLines = [
    currentOrganization?.name ?? '',
    `تاريخ الإنشاء (UTC): ${start} – ${end}`,
    `الخدمة: ${bookingServiceLabels[service] ?? 'كل الخدمات'}`,
    `الحالة: ${statuses[status as keyof typeof statuses] ?? 'كل الحالات'}`,
    `العملة: ${currency === 'all' ? 'كل العملات' : currency}`,
  ];

  return (
    <main className="space-y-6 p-4 md:p-6" dir="rtl">
      <PageHeader icon={BarChart3} title="التقارير" />
      <nav aria-label="التقارير المتخصصة" className="flex flex-wrap gap-3">
        {hasPermission('financial_view') && <Button asChild variant="outline"><Link to="/income-statement">قائمة الدخل</Link></Button>}
        <Button asChild variant="outline"><Link to="/reports/business-health">صحة الأعمال</Link></Button>
        <Button asChild variant="outline"><Link to="/reports/lead-cycle-time">زمن دورة العملاء المحتملين</Link></Button>
        <Button asChild variant="outline"><Link to="/sop/compliance">التزام إجراءات التشغيل</Link></Button>
        {canExport && <Button asChild variant="outline"><Link to="/export-center">مركز التصدير</Link></Button>}
      </nav>

      {orgId && permitted && <Card>
        <CardHeader><CardTitle>الحجوزات المنشأة خلال الفترة</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{currentOrganization?.name} · تُحسب أيام الإنشاء بتوقيت UTC</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1"><Label htmlFor="report-start">من</Label><Input id="report-start" type="date" value={start} max={end} onChange={(event) => update(setStart, event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="report-end">إلى</Label><Input id="report-end" type="date" value={end} min={start} onChange={(event) => update(setEnd, event.target.value)} /></div>
            <div className="space-y-1">
              <Label htmlFor="report-service">نوع الخدمة</Label>
              <Select value={service} onValueChange={(value) => update(setService, value)}>
                <SelectTrigger id="report-service"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">كل الخدمات</SelectItem>
                  {Object.entries(bookingServiceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="report-status">حالة الحجز</Label>
              <Select value={status} onValueChange={(value) => update(setStatus, value)}>
                <SelectTrigger id="report-status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">كل الحالات</SelectItem>
                  {Object.entries(statuses).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label htmlFor="report-currency">رمز العملة</Label><Input id="report-currency" dir="ltr" maxLength={3} placeholder="EGP" value={currencyInput} onChange={(event) => update(setCurrencyInput, event.target.value)} /></div>
          </div>

          {invalid ? <p role="alert" className="text-destructive">اختر تاريخي بداية ونهاية بالترتيب. استخدم رمز عملة من ثلاثة أحرف أو اترك العملة فارغة.</p>
            : isError ? <div className="space-y-2"><p role="alert" className="text-destructive">تعذر تحميل تقرير الحجوزات.</p><Button variant="outline" onClick={() => void refetch()}>إعادة المحاولة</Button></div>
            : isFetching ? <p role="status">جارٍ تحميل تقرير الحجوزات…</p>
            : count === 0 ? <p>لا توجد حجوزات مطابقة للفلاتر.</p>
            : <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">الحجوزات المطابقة {count}</p>
                {canExport && <ReportDownloadButtons
                  key={JSON.stringify([orgId, scope])}
                  title="تقرير الحجوزات" scope={scopeLines} columns={bookingReportColumns}
                  loadRows={async () => rows.map(bookingReportCells)}
                />}
              </div>
              <Table>
                <TableHeader><TableRow>{bookingReportColumns.map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader>
                <TableBody>{rows.slice((displayedPage - 1) * pageSize, displayedPage * pageSize).map((booking) =>
                  <TableRow key={booking.id}>{bookingReportCells(booking).map((cell, index) => <TableCell key={index}>{cell ?? '—'}</TableCell>)}</TableRow>,
                )}</TableBody>
              </Table>
              {count > pageSize && <div className="flex items-center justify-between gap-2">
                <Button variant="outline" disabled={displayedPage <= 1} onClick={() => setPage(displayedPage - 1)}>السابق</Button>
                <span>{displayedPage} / {Math.ceil(count / pageSize)}</span>
                <Button variant="outline" disabled={displayedPage * pageSize >= count} onClick={() => setPage(displayedPage + 1)}>التالي</Button>
              </div>}
            </>}
        </CardContent>
      </Card>}
      {orgId && hasPermission('reports_advanced') && <SmartAlerts key={orgId} />}
    </main>
  );
}
