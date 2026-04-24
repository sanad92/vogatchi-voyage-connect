import AuditLogViewer from '@/components/audit/AuditLogViewer';
import { ScrollText } from 'lucide-react';

const PlatformAdminAudit = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-amber-600" /> سجل التدقيق على مستوى المنصة
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          جميع العمليات الحساسة عبر كل المؤسسات
        </p>
      </div>
      <AuditLogViewer />
    </div>
  );
};

export default PlatformAdminAudit;
