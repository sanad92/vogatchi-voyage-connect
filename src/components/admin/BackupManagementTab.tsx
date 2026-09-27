import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, AlertCircle, History, ExternalLink } from 'lucide-react';

const legacyStatuses: Record<string, string> = {
  completed: 'انتهت بحسب السجل القديم',
  failed: 'سُجّل فشل العملية',
  in_progress: 'سُجّل بدء العملية',
};

const BackupManagementTab = () => {
  const { user } = useOptimizedAuth();
  const { data: backupLogs = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['backup-logs', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) throw new Error('Authentication required');
      // Legacy rows were created without a backup worker. Neither their success
      // status, random file size nor URL can attest to a restorable artifact.
      const { data, error } = await supabase.from('backup_logs')
        .select('id,backup_type,status,started_at')
        .order('started_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user?.id) return <p role="status">سجّل الدخول لعرض سجلات النسخ الاحتياطي.</p>;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />حالة النسخ الاحتياطي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant="secondary">الحماية غير متحقق منها</Badge>
          <p className="text-sm">إنشاء النسخ وجدولتها والتحقق منها غير متاح من هذه الشاشة حاليًا. راجع النسخ المتاحة لدى مزود الاستضافة، وتحقق من الاستعادة قبل الاعتماد عليها.</p>
          <p className="text-sm text-muted-foreground">وجود سجل في التطبيق لا يثبت وجود نسخة قابلة للاستعادة. حالة نسخ مزود الاستضافة ومدة الاحتفاظ بها لم تُتحققا هنا.</p>
          <div className="flex flex-wrap gap-3">
            <Button disabled>إنشاء نسخة — غير متاح حاليًا</Button>
            <Button variant="outline" asChild>
              <a href="https://supabase.com/docs/guides/platform/backups" target="_blank" rel="noopener noreferrer">
                دليل النسخ والاستعادة<ExternalLink className="ms-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />سجلات سابقة غير متحققة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p role="status">جارٍ تحميل السجلات…</p> : isError ? (
            <div role="alert" className="space-y-3 text-destructive">
              <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />تعذر تحميل السجلات. لا يمكن تحديد حالتها الآن.</p>
              <Button variant="outline" disabled={isFetching} onClick={() => { void refetch(); }}>إعادة المحاولة</Button>
            </div>
          ) : backupLogs.length ? (
            <div className="space-y-4">
              {backupLogs.map(log => (
                <div key={log.id} className="space-y-2 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{log.backup_type === 'full' ? 'طلب نسخة كاملة' : log.backup_type === 'incremental' ? 'طلب نسخة تدريجية' : 'طلب نسخ سابق'}</span>
                    <Badge variant="secondary">غير متحقق</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{legacyStatuses[log.status ?? ''] ?? 'حالة السجل غير معروفة'}</p>
                  <p className="text-sm text-muted-foreground">{log.started_at && Number.isFinite(Date.parse(log.started_at)) ? new Date(log.started_at).toLocaleString('ar-EG') : 'تاريخ غير متاح'}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">لا توجد سجلات في التطبيق. هذه النتيجة لا تحدد وجود نسخ لدى مزود الاستضافة.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagementTab;
