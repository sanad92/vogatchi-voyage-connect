import { useQuery } from '@tanstack/react-query';
import { Database, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusLabels: Record<string, string> = {
  completed: 'مكتملة',
  failed: 'فاشلة',
  in_progress: 'جاري التنفيذ',
};

export default function BackupManagementTab() {
  const logs = useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('id, backup_type, status, started_at, file_size, file_url')
        .order('started_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            النسخ الاحتياطي والاستعادة
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          إنشاء النسخ الاحتياطية واستعادتها يتم من إعدادات قاعدة البيانات لدى مزود الاستضافة.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل النسخ الاحتياطية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.isLoading && <p role="status">جاري تحميل سجلات النسخ الاحتياطية...</p>}
          {logs.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
              <p>تعذّر تحميل سجل النسخ الاحتياطية.</p>
              <Button variant="outline" onClick={() => void logs.refetch()}>إعادة المحاولة</Button>
            </div>
          )}
          {logs.isSuccess && logs.data.length === 0 && <p>لا توجد سجلات نسخ احتياطية في النظام.</p>}
          {logs.data?.map(log => {
            const unverified = log.status === 'completed' && !log.file_url;
            return (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{log.backup_type === 'full' ? 'نسخة كاملة' : 'نسخة تدريجية'}</span>
                  <Badge variant={log.status === 'failed' ? 'destructive' : 'outline'}>
                    {unverified ? 'سجل غير موثّق' : statusLabels[log.status] ?? log.status}
                  </Badge>
                  {!unverified && log.file_size && <span className="text-sm text-muted-foreground">{log.file_size}</span>}
                </div>
                <time dateTime={log.started_at} className="text-sm text-muted-foreground">
                  {new Date(log.started_at).toLocaleString('ar-EG')}
                </time>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
