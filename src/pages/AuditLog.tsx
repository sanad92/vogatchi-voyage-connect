import AuditLogViewer from '@/components/audit/AuditLogViewer';

const AuditLog = () => {
  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">سجل التدقيق</h1>
        <p className="text-muted-foreground text-sm mt-1">تتبع جميع العمليات والتغييرات في النظام</p>
      </div>
      <AuditLogViewer showFilters={true} />
    </div>
  );
};

export default AuditLog;
