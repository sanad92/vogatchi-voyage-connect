import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useImpersonationSession } from '@/hooks/useImpersonationSession';
import { supabase } from '@/integrations/supabase/client';
import { companyProfilePath } from '@/lib/platformCompanyFollowup';

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export default function PlatformActAsPage() {
  const [params, setParams] = useSearchParams();
  const organizationId = params.get('company');
  const { user } = useOptimizedAuth();
  const { dir, language } = useLanguage();
  const qc = useQueryClient();
  const { active, loading, start, stop } = useImpersonationSession();
  const [search, setSearch] = useState('');
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [enrollment, setEnrollment] = useState<{ id: string; qr: string; secret: string }>();
  const targetId = active?.target_org_id ?? organizationId;

  const company = useQuery({
    queryKey: ['support-organization', user?.id, targetId],
    enabled: !!targetId && uuid.test(targetId),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('organizations').select('id,name').eq('id', targetId!).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const companies = useQuery({
    queryKey: ['support-organizations', user?.id, search],
    enabled: !active,
    queryFn: async ({ signal }) => {
      const query = supabase.from('organizations').select('id,name').order('name').limit(20).abortSignal(signal);
      const { data, error } = await (search.trim() ? query.ilike('name', `%${search.trim()}%`) : query);
      if (error) throw error;
      return data;
    },
  });
  const authKey = ['support-mfa', user?.id];
  const factors = useQuery({
    queryKey: authKey,
    enabled: !!user && !active,
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp;
    },
  });
  const enroll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'SafarERP' });
      if (error) throw error;
      return { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
    },
    onSuccess: setEnrollment,
    onError: () => toast.error('تعذّر إعداد التحقق الثنائي. حاول مرة أخرى.'),
  });
  const verify = useMutation({
    mutationFn: async () => {
      const factorId = enrollment?.id ?? factors.data?.[0]?.id;
      if (!factorId) throw new Error('No authenticator');
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
    },
    onSuccess: async () => {
      setEnrollment(undefined);
      setCode('');
      await qc.invalidateQueries({ queryKey: authKey });
      if (!company.data || active) return;
      start.mutate({ target_org_id: company.data.id, org_pin: pin, reason: reason.trim() }, {
        onSuccess: () => { setPin(''); setReason(''); },
      });
    },
    onError: () => { setCode(''); toast.error('تعذّر تأكيد رمز التحقق. استخدم الرمز الحالي من تطبيق المصادقة.'); },
  });
  const snapshot = useQuery({
    queryKey: ['support-booking-snapshot', user?.id, active?.session_id],
    enabled: !!active,
    refetchInterval: 30_000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('platform_support_booking_snapshot').abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const formatDate = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
  });
  const busy = verify.isPending || start.isPending;
  const canVerify = !!enrollment || !!factors.data?.length;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (company.data && code.length === 6 && pin.length === 6 && reason.trim().length >= 10 && canVerify && !busy) verify.mutate();
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8" dir={dir}>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sidebar p-5 text-sidebar-foreground">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-5 w-5" aria-hidden="true" />جلسة دعم للمؤسسة</h1>
          <p className="mt-2 text-sm text-sidebar-foreground/80">اطّلع على ملخص أحدث الحجوزات لمدة ٣٠ دقيقة باستخدام تطبيق المصادقة وPIN المؤسسة.</p>
        </div>
        <Button asChild variant="secondary" size="sm"><Link to="/platform/organizations">كل الشركات</Link></Button>
      </header>
      {loading ? <p role="status">جارٍ تحميل البيانات</p> : active ? (
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>أحدث حجوزات المؤسسة</CardTitle>
            {company.data && <Link className="w-fit text-sm text-primary underline" to={companyProfilePath(company.data.id)} data-no-translate>{company.data.name}</Link>}
            <Button size="sm" variant="outline" className="w-fit" disabled={stop.isPending} onClick={() => stop.mutate()}>إنهاء الجلسة</Button>
          </CardHeader>
          <CardContent>
            {snapshot.isPending ? <p role="status">جارٍ تحميل البيانات</p> : snapshot.isError ? <p role="alert">تعذّر عرض الحجوزات. راجع حالة جلسة الدعم.</p> : !snapshot.data.length ? (
              <p className="text-sm text-muted-foreground">لا توجد حجوزات مسجلة.</p>
            ) : (
              <ul className="divide-y divide-border">
                {snapshot.data.map((booking, index) => (
                  <li key={`${booking.booking_number}-${index}`} className="flex flex-wrap gap-x-4 gap-y-1 py-3 text-sm">
                    <bdi className="break-all font-semibold" data-no-translate>{booking.booking_number || '—'}</bdi>
                    <span>{booking.booking_type}</span><span>{booking.status}</span>
                    {booking.created_at && <time dateTime={booking.created_at}>{formatDate.format(new Date(booking.created_at))}</time>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">اختر المؤسسة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input aria-label="ابحث عن مؤسسة" placeholder="ابحث بالاسم..." value={search} onChange={(event) => setSearch(event.target.value)} />
              {companies.isError && <p role="alert">تعذّر تحميل الشركات</p>}
              {companies.data?.map((org) => (
                <Button key={org.id} type="button" variant={organizationId === org.id ? 'secondary' : 'ghost'} className="w-full justify-start" data-no-translate
                  disabled={busy} onClick={() => { setPin(''); setCode(''); setParams({ company: org.id }); }}>{org.name}</Button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">التحقق وبدء الجلسة</CardTitle>
              {company.data && <bdi className="text-sm text-muted-foreground" data-no-translate>{company.data.name}</bdi>}
            </CardHeader>
            <CardContent className="space-y-4">
              {factors.isError && <Button variant="outline" size="sm" onClick={() => factors.refetch()}>إعادة تحميل وسائل التحقق</Button>}
              {factors.isSuccess && !canVerify && <Button variant="outline" disabled={enroll.isPending} onClick={() => enroll.mutate()}>إعداد تطبيق المصادقة</Button>}
              {enrollment && (
                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <p>امسح رمز QR بتطبيق المصادقة، أو أدخل المفتاح يدويًا.</p>
                  <img src={enrollment.qr.startsWith('data:') ? enrollment.qr : `data:image/svg+xml;utf-8,${encodeURIComponent(enrollment.qr)}`} alt="رمز إعداد تطبيق المصادقة" width={160} height={160} />
                  <Input aria-label="مفتاح تطبيق المصادقة" dir="ltr" type="password" readOnly value={enrollment.secret} />
                </div>
              )}
              <form className="space-y-3" onSubmit={submit}>
                <div className="space-y-1.5">
                  <Label htmlFor="support-mfa-code">رمز تطبيق المصادقة</Label>
                  <Input id="support-mfa-code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} disabled={busy || !canVerify} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-pin">PIN المؤسسة</Label>
                  <Input id="support-pin" type="password" inputMode="numeric" dir="ltr" maxLength={6} disabled={busy} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-reason">سبب جلسة الدعم</Label>
                  <Textarea id="support-reason" minLength={10} maxLength={500} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} required />
                </div>
                <Button type="submit" disabled={!company.data || !canVerify || code.length !== 6 || pin.length !== 6 || reason.trim().length < 10 || busy}>تحقق وابدأ جلسة الدعم</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
