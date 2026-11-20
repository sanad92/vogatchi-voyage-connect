import { DocumentsPanel } from '@/components/documents/DocumentsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useDocumentDeletionAudit } from '@/hooks/useDocumentCenter';

const DocumentCenter = () => {
  const { orgRole } = useOrganization();
  const canReview = orgRole === 'owner' || orgRole === 'admin' || orgRole === 'manager';
  const audit = useDocumentDeletionAudit(canReview);

  return (
    <div className="w-full space-y-6 px-4 md:px-6 lg:px-8 py-8" dir="rtl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          مركز المستندات الموحّد
        </h1>
        <p className="text-sm text-muted-foreground">
          إدارة مركزية لجوازات السفر، التأشيرات، الفاوتشرات، الفواتير، العقود وجميع المستندات المتعلقة بالعملاء والحجوزات والموردين.
        </p>
      </div>
      <DocumentsPanel title="جميع المستندات" />
      {canReview && <Card>
        <CardHeader><CardTitle>سجل حذف المستندات</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {audit.isLoading ? <p role="status">جارٍ تحميل سجل الحذف…</p>
            : audit.isError ? <>
                <p role="alert" className="text-destructive">تعذّر تحميل سجل الحذف.</p>
                <Button variant="outline" onClick={() => void audit.refetch()}>إعادة المحاولة</Button>
              </>
            : !audit.data?.length ? <p>لا توجد عمليات حذف مسجلة.</p>
            : <>
                <p className="text-sm text-muted-foreground">آخر 100 عملية حذف متاحة للمؤسسة.</p>
                <Table>
                  <TableHeader><TableRow><TableHead>معرّف المستند</TableHead><TableHead>معرّف المستخدم</TableHead><TableHead>تاريخ الحذف</TableHead></TableRow></TableHeader>
                  <TableBody>{audit.data.map((row) => <TableRow key={row.id}>
                    <TableCell><bdi>{row.document_id ?? '—'}</bdi></TableCell>
                    <TableCell><bdi>{row.actor_id ?? 'النظام'}</bdi></TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleString('ar-EG')}</TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              </>}
        </CardContent>
      </Card>}
    </div>
  );
};

export default DocumentCenter;
