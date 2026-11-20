import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Route = {
  page_id: string;
  form_id: string;
  revision: string;
  active: boolean;
  last_imported_at: string | null;
};

const errors: Record<string, string> = {
  invalid_input: 'راجع معرّفي الصفحة والنموذج والرمز، وعدد النماذج المرتبطة بالمؤسسة.',
  provider_rejected: 'رفضت Meta الرمز أو صلاحية الوصول.',
  provider_unavailable: 'تعذّر التحقق لدى Meta حاليًا.',
  route_not_verified: 'تعذّر التحقق من تطابق الصفحة والنموذج مع رمز الصفحة.',
  route_conflict: 'تعذّر حفظ الربط. حدّث القائمة وراجع معرّفي الصفحة والنموذج.',
  forbidden: 'إدارة هذا الربط تحتاج صلاحية إعدادات المؤسسة.',
  rate_limited: 'وصلت لحد المحاولات المؤقت. حاول بعد دقيقة.',
  session_required: 'سجّل الدخول مرة أخرى.',
};

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('meta-lead-ads-config', { body });
  if (error) {
    const response: Response | undefined = error.context;
    const code = response?.status === 429 ? 'rate_limited' : (await response?.json?.().catch(() => null))?.error;
    throw new Error(errors[String(code)] || 'تعذّر تحميل أو حفظ ربط Meta حاليًا.');
  }
  if (!data) throw new Error('تعذّر تحميل أو حفظ ربط Meta حاليًا.');
  return data as T;
}

export default function MetaLeadAdsSettings({ organizationId }: { organizationId: string }) {
  const [editing, setEditing] = useState<Route | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['meta-lead-ads-config', organizationId], retry: false,
    queryFn: () => invoke<{ routes: Route[]; webhookConfigured: boolean }>({ organizationId, action: 'list' }),
  });

  async function change(action: 'connect' | 'disconnect', fields: Record<string, unknown>) {
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await invoke({ organizationId, action, ...fields });
      setNotice(action === 'connect' ? 'تم التحقق من الصفحة والنموذج وحفظ الربط.' : 'تم إيقاف استقبال النموذج.');
      setEditing(null);
      await query.refetch();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'تعذّر حفظ الربط.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const pageToken = String(form.get('pageToken') ?? '').trim();
    void change('connect', {
      page: editing && editing !== 'new' ? editing.page_id : String(form.get('page') ?? '').trim(),
      form: editing && editing !== 'new' ? editing.form_id : String(form.get('form') ?? '').trim(),
      revision: editing && editing !== 'new' ? editing.revision : null,
      pageToken,
    });
    const tokenField = event.currentTarget.elements.namedItem('pageToken');
    if (tokenField instanceof HTMLInputElement) tokenField.value = '';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">طلبات إعلانات Meta</CardTitle>
        <CardDescription>اربط نموذج Instant Forms بمؤسستك ليصل الطلب إلى مرحلة جديد في CRM.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isPending && <p role="status" className="text-sm text-muted-foreground">جارٍ تحميل حالة الربط…</p>}
        {query.error && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <span>{query.error.message}</span>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button>
        </div>}
        {query.data && <>
          <p className="text-sm text-muted-foreground">
            {query.data.webhookConfigured ? 'بيانات إثبات الـWebhook مضبوطة. أرسل طلب اختبار من Meta للتحقق من الاستقبال.'
              : 'إعداد استقبال Meta على الخادم غير مكتمل.'}
          </p>
          {query.data.routes.map(route => (
            <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm" key={route.page_id + ':' + route.form_id}>
              <span>الصفحة <bdi>{route.page_id}</bdi> · النموذج <bdi>{route.form_id}</bdi></span>
              <Badge variant={route.active ? 'default' : 'secondary'}>{route.active ? 'مربوط' : 'متوقف'}</Badge>
              <span className="text-muted-foreground">{route.last_imported_at
                ? 'آخر استيراد ' + new Date(route.last_imported_at).toLocaleString()
                : 'بانتظار أول طلب'}</span>
              <Button size="sm" variant="outline" type="button" disabled={busy} onClick={() => setEditing(route)}>
                {route.active ? 'تحديث الرمز' : 'إعادة الربط'}
              </Button>
              {route.active && <Button size="sm" variant="ghost" type="button" disabled={busy}
                onClick={() => void change('disconnect', { page: route.page_id, form: route.form_id, revision: route.revision })}>إيقاف النموذج</Button>}
            </div>
          ))}
          {editing ? <form key={editing === 'new' ? 'new' : editing.revision} onSubmit={submit} className="space-y-3" autoComplete="off">
            {editing === 'new' && <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="meta-lead-page">معرّف صفحة Meta</Label>
                <Input id="meta-lead-page" name="page" dir="ltr" inputMode="numeric" required pattern="[0-9]+" maxLength={32} disabled={busy} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="meta-lead-form">معرّف نموذج Instant Form</Label>
                <Input id="meta-lead-form" name="form" dir="ltr" inputMode="numeric" required pattern="[0-9]+" maxLength={32} disabled={busy} />
              </div>
            </div>}
            <div className="space-y-1">
              <Label htmlFor="meta-lead-token">رمز وصول الصفحة من Meta</Label>
              <Input id="meta-lead-token" name="pageToken" type="password" dir="ltr" autoComplete="new-password"
                required minLength={16} maxLength={4096} spellCheck={false} disabled={busy} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? 'جارٍ التحقق…' : 'تحقق واحفظ'}</Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setEditing(null)}>إلغاء</Button>
            </div>
          </form> : <Button type="button" size="sm" disabled={busy} onClick={() => setEditing('new')}>ربط نموذج</Button>}
        </>}
        {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
      </CardContent>
    </Card>
  );
}
