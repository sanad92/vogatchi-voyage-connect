import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { publicSiteSlugPattern } from '@/lib/publicBooking';

interface SiteSettings {
  slug: string;
  enabled: boolean;
  acceptsBooking: boolean;
}

const initialSettings: SiteSettings = { slug: '', enabled: false, acceptsBooking: false };

export default function PublicSiteSettings({ orgId }: { orgId: string }) {
  const settings = useQuery({
    queryKey: ['company-public-site-settings', orgId],
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<SiteSettings>('get_company_public_site_settings', { _org: orgId });
      if (error) throw new Error('Unable to read public site settings');
      return data;
    },
    retry: false,
  });

  if (settings.isLoading) return <p role="status">جارٍ تحميل إعدادات الموقع العام…</p>;
  if (settings.isError) {
    return (
      <div role="alert" className="space-y-2">
        <p>تعذّر تحميل إعدادات الموقع العام.</p>
        <Button variant="outline" onClick={() => void settings.refetch()}>إعادة المحاولة</Button>
      </div>
    );
  }
  return <SiteSettingsForm orgId={orgId} current={settings.data ?? null} reload={settings.refetch} />;
}

function SiteSettingsForm({ orgId, current, reload }: {
  orgId: string;
  current: SiteSettings | null;
  reload: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const values = draft ?? current ?? initialSettings;
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [errorText, setErrorText] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !publicSiteSlugPattern.test(values.slug)) return;
    setSaving(true);
    setStatus('');
    setErrorText('');
    try {
      const { data, error } = await callUntypedRpc<SiteSettings>('set_company_public_site_settings', {
        _org: orgId,
        _slug: values.slug,
        _enabled: values.enabled,
        _accepts_booking: values.acceptsBooking,
      });
      if (error?.code === '23505') {
        setErrorText('العنوان مستخدم بالفعل. اختر عنوانًا مختلفًا.');
        return;
      }
      if (error || !data) throw new Error('Unable to save public site settings');
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: ['company-publications', orgId] })]);
      setDraft(null);
      setStatus('تم حفظ إعدادات الموقع العام.');
    } catch {
      setErrorText('تعذّر حفظ إعدادات الموقع العام.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">الموقع العام للشركة</h2>
      <form onSubmit={save} className="space-y-3">
        <div className="grid max-w-md gap-2">
          <label htmlFor="company-public-slug" className="text-sm font-medium">عنوان الشركة في الرابط</label>
          <Input id="company-public-slug" dir="ltr" value={values.slug} disabled={saving} readOnly={Boolean(current)}
            aria-describedby="company-public-slug-help" required maxLength={40} minLength={3}
            onChange={event => setDraft({ ...values, slug: event.target.value.trim().toLowerCase() })} />
          <p id="company-public-slug-help" className="text-sm text-muted-foreground">
            استخدم من 3 إلى 40 حرفًا إنجليزيًا صغيرًا أو رقمًا، ويمكن استخدام الشرطة بين الحروف. العنوان ثابت بعد الحفظ.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.enabled} disabled={saving}
            onChange={event => setDraft({ ...values, enabled: event.target.checked })} />
          تفعيل الموقع العام باسم الشركة
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.acceptsBooking} disabled={saving}
            onChange={event => setDraft({ ...values, acceptsBooking: event.target.checked })} />
          استقبال طلبات عروض الأسعار في قائمة العملاء المحتملين
        </label>
        <Button type="submit" disabled={saving || !publicSiteSlugPattern.test(values.slug)}>
          {saving ? 'جارٍ الحفظ…' : 'حفظ الإعدادات'}
        </Button>
      </form>
      {status && <p role="status" className="text-sm">{status}</p>}
      {errorText && <p role="alert" className="text-sm text-destructive">{errorText}</p>}
      {current?.enabled && current.acceptsBooking && (
        <Link className="block text-sm text-primary underline" to={`/p/${current.slug}/booking-request`}>
          فتح الرابط العام لاستقبال الطلبات
        </Link>
      )}
    </section>
  );
}
