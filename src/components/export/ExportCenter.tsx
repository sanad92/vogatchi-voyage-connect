import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useSupabasePermissions, type PermissionKey } from '@/hooks/useSupabasePermissions';
import { useOrganization } from '@/contexts/OrganizationContext';
import { allReportRows, bookingReportCells, bookingReportColumns, loadBookingReportRows } from '@/lib/reportRows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportDownloadButtons from './ReportDownloadButtons';

const reports = {
  bookings: {
    label: 'الحجوزات', permissions: ['bookings_view'], columns: bookingReportColumns,
    load: async (orgId) => (await loadBookingReportRows(orgId)).map(bookingReportCells),
  },
  customers: {
    label: 'العملاء', permissions: ['customers_view'], columns: ['اسم العميل', 'تاريخ الإنشاء', 'تاريخ الأرشفة'],
    load: async (orgId) => {
      const rows = await allReportRows((after, limit) => {
        const query = supabase.from('customers').select('id, name, created_at, archived_at')
          .eq('organization_id', orgId).order('id').limit(limit);
        return after ? query.gt('id', after) : query;
      });
      return rows.map((row) => [row.name, row.created_at?.slice(0, 10), row.archived_at?.slice(0, 10)]);
    },
  },
  invoices: {
    label: 'الفواتير', permissions: ['invoices_view', 'financial_view'],
    columns: ['رقم الفاتورة', 'تاريخ الإصدار', 'تاريخ الاستحقاق', 'الحالة', 'حالة السداد', 'الإجمالي', 'المتبقي', 'العملة'],
    load: async (orgId) => {
      const rows = await allReportRows((after, limit) => {
        const query = supabase.from('invoices').select('id, invoice_number, issued_date, due_date, status, payment_status, final_amount, remaining_amount, currency')
          .eq('organization_id', orgId).order('id').limit(limit);
        return after ? query.gt('id', after) : query;
      });
      return rows.map((row) => [row.invoice_number, row.issued_date, row.due_date, row.status, row.payment_status, row.final_amount, row.remaining_amount, row.currency]);
    },
  },
  suppliers: {
    label: 'الموردون', permissions: ['suppliers_view'], columns: ['المورد', 'النوع', 'نشط', 'تاريخ الإنشاء'],
    load: async (orgId) => {
      const rows = await allReportRows((after, limit) => {
        const query = supabase.from('suppliers').select('id, name, type, is_active, created_at')
          .eq('organization_id', orgId).order('id').limit(limit);
        return after ? query.gt('id', after) : query;
      });
      return rows.map((row) => [row.name, row.type, row.is_active, row.created_at?.slice(0, 10)]);
    },
  },
  employees: {
    label: 'الموظفون', permissions: ['employees_view'], columns: ['كود الموظف', 'الموظف', 'القسم', 'الوظيفة', 'نشط'],
    load: async (orgId) => {
      const rows = await allReportRows((after, limit) => {
        const query = supabase.from('employee_directory').select('id, employee_code, full_name, department, position, is_active')
          .eq('organization_id', orgId).order('id').limit(limit);
        return after ? query.gt('id', after) : query;
      });
      return rows.map((row) => [row.employee_code, row.full_name, row.department, row.position, row.is_active]);
    },
  },
} satisfies Record<string, {
  label: string;
  permissions: PermissionKey[];
  columns: string[];
  load: (orgId: string) => Promise<(string | number | boolean | null | undefined)[][]>;
}>;

export default function ExportCenter() {
  const orgId = useOrgId();
  const { currentOrganization } = useOrganization();
  const { hasPermission, getPermissionScope, loading } = useSupabasePermissions();
  const [selectedReport, setSelectedReport] = useState<keyof typeof reports>('bookings');
  const permitted = (Object.keys(reports) as (keyof typeof reports)[]).filter((type) =>
    reports[type].permissions.every((permission) => hasPermission(permission) && getPermissionScope(permission) === 'organization'),
  );
  const report = permitted.includes(selectedReport) ? reports[selectedReport] : reports[permitted[0]];

  return (
    <Card dir="rtl">
      <CardHeader><CardTitle>مركز التصدير</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p role="status">جارٍ التحقق من صلاحيات التقارير…</p>
          : !orgId || !hasPermission('reports_export') ? <p>يلزم اختيار مؤسسة وامتلاك صلاحية تصدير التقارير.</p>
          : <>
              {hasPermission('financial_view') && <Link className="block text-primary underline" to="/income-statement">قائمة الدخل والتصدير المالي حسب الفترة والعملة</Link>}
              {report ? <>
                <Select value={permitted.includes(selectedReport) ? selectedReport : permitted[0]} onValueChange={(value: keyof typeof reports) => setSelectedReport(value)}>
                  <SelectTrigger aria-label="نوع السجلات"><SelectValue /></SelectTrigger>
                  <SelectContent>{permitted.map((type) => <SelectItem key={type} value={type}>{reports[type].label}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">تصدير السجلات المتاحة للمؤسسة {currentOrganization?.name}.</p>
                <ReportDownloadButtons
                  key={`${orgId}:${report.label}`}
                  title={`تقرير ${report.label}`}
                  scope={[currentOrganization?.name ?? '', 'كل الفترات']}
                  columns={report.columns}
                  loadRows={() => report.load(orgId)}
                />
              </> : <p>لا توجد أنواع سجلات متاحة بصلاحياتك الحالية.</p>}
            </>}
      </CardContent>
    </Card>
  );
}
