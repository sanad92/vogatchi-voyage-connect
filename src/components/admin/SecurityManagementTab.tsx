import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const actionLabels: Record<string, string> = {
  platform_setting_updated: 'تحديث إعداد للمنصة',
  impersonation_started: 'بدء جلسة دعم للمؤسسة',
  impersonation_stopped: 'إنهاء جلسة دعم للمؤسسة',
};
const dateFormat = new Intl.DateTimeFormat('ar-EG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
});

export default function SecurityManagementTab() {
  const events = useQuery({
    queryKey: ['platform-security-events'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('platform_security_events').abortSignal(signal);
      if (error) throw error;
      return data;
    },
    refetchOnMount: 'always',
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>أمان المنصة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">تقدر تفعّل تطبيق المصادقة لجلسات دعم المؤسسات من شاشة جلسة الدعم.</p>
          <Button asChild variant="outline"><Link to="/platform/act-as">التحقق الثنائي لجلسات الدعم</Link></Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>أحدث أحداث أمان المنصة</CardTitle>
          <p className="text-sm text-muted-foreground">آخر ٥٠ عملية مسجلة على مستوى المنصة، بما فيها تغييرات الإعدادات وجلسات الدعم.</p>
        </CardHeader>
        <CardContent>
          {events.isPending && <p role="status">جارٍ تحميل السجل...</p>}
          {events.isError && <div className="flex flex-wrap items-center gap-3" role="alert">
            <p>تعذّر تحميل السجل.</p>
            <Button variant="outline" onClick={() => void events.refetch()}>إعادة المحاولة</Button>
          </div>}
          {events.isSuccess && events.data.length === 0 && <p>لا توجد عمليات مسجلة.</p>}
          {events.isSuccess && events.data.length > 0 && <ul className="divide-y">
            {events.data.map(event => (
              <li className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0" key={event.id}>
                <div className="min-w-0">
                  <p className="break-words font-medium">{actionLabels[event.action] ?? event.action}</p>
                  {(event.setting_key || event.target_table) && <p className="break-all text-xs text-muted-foreground" dir="ltr">{event.setting_key || event.target_table}</p>}
                </div>
                {event.created_at && <time className="text-sm text-muted-foreground" dateTime={event.created_at}>{dateFormat.format(new Date(event.created_at))}</time>}
              </li>
            ))}
          </ul>}
        </CardContent>
      </Card>
    </div>
  );
}
