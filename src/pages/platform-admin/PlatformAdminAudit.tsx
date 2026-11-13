import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const pageSize = 30;
const dateFormat = new Intl.DateTimeFormat('ar-EG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
});
const actionLabels: Record<string, string> = {
  platform_setting_updated: 'تحديث إعداد للمنصة',
  platform_role_granted: 'منح دور على المنصة',
  platform_role_changed: 'تغيير دور على المنصة',
  platform_role_removed: 'إزالة دور من المنصة',
  impersonation_started: 'بدء جلسة دعم للمؤسسة',
  impersonation_stopped: 'إنهاء جلسة دعم للمؤسسة',
};
const roleLabels: Record<string, string> = {
  platform_owner: 'مالك منصة',
  platform_admin: 'مدير منصة',
};
const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function PlatformAdminAudit() {
  const [scope, setScope] = useState('all');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const invalidRange = !!from && !!to && from > to;

  const organizations = useQuery({
    queryKey: ['platform-audit-organizations'],
    queryFn: async ({ signal }) => {
      const result = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('organizations').select('id,name')
          .order('name').order('id').range(offset, offset + 499).abortSignal(signal);
        if (error) throw error;
        result.push(...data);
        if (data.length < 500) return result;
      }
    },
  });
  const actions = useQuery({
    queryKey: ['platform-audit-actions'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('platform_audit_actions').abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const entries = useQuery({
    queryKey: ['platform-audit-entries', scope, action, from, to, page],
    enabled: !invalidRange,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('platform_audit_entries', {
        p_scope: scope, p_action: action || null, p_from: from || null, p_to: to || null, p_page: page,
      }).abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const rows = entries.data ?? [];

  return (
    <section className="mx-auto space-y-5 p-4 md:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ScrollText className="h-6 w-6 text-amber-600" aria-hidden="true" /> سجل التدقيق على مستوى المنصة
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">العمليات المسجلة في المنصة والمؤسسات، بتوقيت القاهرة.</p>
      </header>
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="platform-audit-org">المؤسسة</Label>
            <select id="platform-audit-org" className={selectClass} value={scope} onChange={event => { setScope(event.target.value); setPage(0); }}>
              <option value="all">المنصة وكل المؤسسات</option>
              <option value="platform">المنصة فقط</option>
              {organizations.data?.map(org => <option key={org.id} value={org.id} data-no-translate>{org.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="platform-audit-action">نوع العملية</Label>
            <select id="platform-audit-action" className={selectClass} value={action} onChange={event => { setAction(event.target.value); setPage(0); }}>
              <option value="">كل العمليات</option>
              {actions.data?.map(item => <option key={item.action} value={item.action}>{actionLabels[item.action] ?? item.action}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="platform-audit-from">من تاريخ</Label>
            <Input id="platform-audit-from" type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(0); }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="platform-audit-to">إلى تاريخ</Label>
            <Input id="platform-audit-to" type="date" value={to} onChange={event => { setTo(event.target.value); setPage(0); }} />
          </div>
          {(organizations.isError || actions.isError) && (
            <div role="alert" className="col-span-full flex flex-wrap items-center gap-2 text-sm">
              <p>تعذّر تحميل بعض خيارات التصفية.</p>
              <Button variant="outline" size="sm" onClick={() => { void organizations.refetch(); void actions.refetch(); }}>إعادة المحاولة</Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-4">
          {invalidRange ? <p role="alert">تاريخ البداية لازم يكون قبل أو نفس تاريخ النهاية.</p>
            : entries.isPending ? <p role="status">جارٍ تحميل السجل...</p>
            : entries.isError ? <div className="flex flex-wrap items-center gap-3" role="alert">
              <p>تعذّر تحميل سجل التدقيق.</p>
              <Button variant="outline" size="sm" onClick={() => void entries.refetch()}>إعادة المحاولة</Button>
            </div>
            : rows.length === 0 ? <p>لا توجد عمليات مطابقة للفلاتر.</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>المؤسسة</TableHead>
                    <TableHead>نفّذ العملية</TableHead>
                    <TableHead>نوع العملية</TableHead>
                    <TableHead>السجل المرتبط</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, pageSize).map(row => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {row.occurred_at ? <time dateTime={row.occurred_at}>{dateFormat.format(new Date(row.occurred_at))}</time> : '—'}
                      </TableCell>
                      <TableCell><bdi data-no-translate={!!row.organization_id}>{row.organization_name ?? (row.organization_id || 'المنصة')}</bdi></TableCell>
                      <TableCell>
                        {row.actor_name && <bdi className="block" data-no-translate>{row.actor_name}</bdi>}
                        <bdi className="block text-sm text-muted-foreground" data-no-translate={!!(row.actor_email || row.actor_id)}>
                          {row.actor_email ?? (row.actor_name ? '' : row.actor_id ?? 'غير مسجل')}
                        </bdi>
                      </TableCell>
                      <TableCell>
                        {actionLabels[row.action] ?? row.action}
                        {(row.old_role || row.new_role) && (
                          <p className="text-sm text-muted-foreground">
                            {row.old_role ? roleLabels[row.old_role] ?? row.old_role : '—'} → {row.new_role ? roleLabels[row.new_role] ?? row.new_role : '—'}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <bdi className="block" data-no-translate>{row.setting_key ?? row.target_table ?? '—'}</bdi>
                        {row.target_id && <bdi className="block break-all text-xs text-muted-foreground" data-no-translate>{row.target_id}</bdi>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          {!invalidRange && (page > 0 || rows.length > pageSize) && (
            <nav className="flex items-center gap-3" aria-label="صفحات سجل التدقيق">
              <Button variant="outline" size="sm" disabled={page === 0 || entries.isFetching} onClick={() => setPage(value => value - 1)}>السابق</Button>
              <span className="text-sm">{page + 1}</span>
              <Button variant="outline" size="sm" disabled={rows.length <= pageSize || entries.isFetching} onClick={() => setPage(value => value + 1)}>التالي</Button>
            </nav>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
