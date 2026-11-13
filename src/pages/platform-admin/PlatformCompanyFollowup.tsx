import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlatformCompanyContacts } from '@/components/platform-admin/PlatformCompanyContacts';
import { PAGE_SIZE, TablePager } from '@/components/platform-admin/TablePager';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { companyProfilePath } from '@/lib/platformCompanyFollowup';

const listUrl = '/platform/organizations/followup';
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const statusLabels: Record<string, string> = {
  trialing: 'تجريبي', active: 'نشط', expired: 'منتهٍ', cancelled: 'ملغي',
};

interface CompanyActivation {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  subscription_status: string | null;
  expires_at: string | null;
  plan_name: string | null;
  plan_name_ar: string | null;
  first_quote_at: string | null;
  first_booking_at: string | null;
  last_activity_at: string | null;
  active_members: number;
  open_tickets: number;
  pending_transfers: number;
  last_confirmed_payment_at: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  next_followup_at: string | null;
  note: string | null;
  followup_updated_at: string | null;
}

function useCompanyFormatting() {
  const { language, t } = useLanguage();
  const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Africa/Cairo' });
  return {
    date: (value: string | null) => value ? dateFormat.format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : '—',
    number: new Intl.NumberFormat(locale).format,
    plan: (company: CompanyActivation) => (
      language === 'en' ? company.plan_name || company.plan_name_ar : company.plan_name_ar || company.plan_name
    ) || t('خطة غير محددة'),
    status: (company: CompanyActivation) => {
      const status = company.subscription_status;
      if ((status === 'trialing' || status === 'active') && company.expires_at && Date.parse(company.expires_at) <= Date.now()) {
        return t('منتهٍ');
      }
      return t(status ? statusLabels[status] ?? status : 'بدون اشتراك');
    },
  };
}

function CompanySummary({ company }: { company: CompanyActivation }) {
  const { date, number, plan, status } = useCompanyFormatting();
  const cells = [
    ['أول عرض سعر', date(company.first_quote_at)],
    ['أول حجز', date(company.first_booking_at)],
    ['آخر عرض أو حجز مسجّل', date(company.last_activity_at)],
    ['آخر دفعة مؤكدة', date(company.last_confirmed_payment_at)],
    ['المستخدمون النشطون', number(company.active_members)],
    ['تذاكر دعم مفتوحة', number(company.open_tickets)],
    ['تحويلات بنكية معلّقة', number(company.pending_transfers)],
    ['انتهاء الاشتراك', date(company.expires_at)],
  ];
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="break-words" data-no-translate>{company.name}</CardTitle>
          <Badge variant={company.is_active ? 'secondary' : 'destructive'}>{company.is_active ? 'نشطة' : 'معلّقة'}</Badge>
          <Badge variant="outline">{status(company)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span data-no-translate>{plan(company)}</span>
          <span><span>تاريخ التسجيل</span> <bdi>{date(company.created_at)}</bdi></span>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cells.map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-lg bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-sm font-semibold"><bdi>{value}</bdi></dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function FollowupForm({ company }: { company: CompanyActivation }) {
  const { user } = useOptimizedAuth();
  const { dir } = useLanguage();
  const qc = useQueryClient();
  const [assigned, setAssigned] = useState(company.assigned_to ?? 'unassigned');
  const [nextDate, setNextDate] = useState(company.next_followup_at ?? '');
  const [revision, setRevision] = useState(company.followup_updated_at);
  const [note, setNote] = useState(company.note ?? '');
  const staff = useQuery({
    queryKey: ['platform-company-staff', user?.id],
    queryFn: async ({ signal }) => {
      const { data: roles, error } = await supabase.from('platform_roles').select('user_id')
        .in('role', ['platform_owner', 'platform_admin']).abortSignal(signal);
      if (error) throw error;
      const ids = [...new Set(roles.map((role) => role.user_id))];
      if (!ids.length) return [];
      const { data: profiles, error: profilesError } = await supabase.from('profiles')
        .select('id, full_name, email').in('id', ids).abortSignal(signal);
      if (profilesError) throw profilesError;
      return ids.map((id) => {
        const profile = profiles.find((item) => item.id === id);
        return { id, label: profile?.full_name || profile?.email || id };
      });
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Missing platform session');
      const fields = {
        assigned_to: assigned === 'unassigned' ? null : assigned,
        next_followup_at: nextDate || null,
        note: note.trim(),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = revision
        ? await supabase.from('platform_company_followups').update(fields)
          .eq('organization_id', company.id).eq('updated_at', revision).select('organization_id').maybeSingle()
        : await supabase.from('platform_company_followups').insert({ ...fields, organization_id: company.id })
          .select('organization_id').single();
      if (error) throw error;
      if (!data) throw new Error('stale_followup');
      return fields.updated_at;
    },
    onSuccess: (timestamp) => {
      setRevision(timestamp);
      qc.invalidateQueries({ queryKey: ['platform-company-activation', user?.id] });
      toast.success('تم حفظ متابعة الشركة');
    },
    onError: (error) => {
      const stale = error instanceof Error && error.message === 'stale_followup';
      const conflict = typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
      if (stale || conflict) {
        qc.invalidateQueries({ queryKey: ['platform-company-activation', user?.id, company.id] });
        toast.error('المتابعة اتحدّثت من جلسة تانية. راجع النسخة الأحدث.');
      } else {
        toast.error('تعذّر حفظ متابعة الشركة');
      }
    },
  });
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">متابعة الشركة</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="company-assignee">مسؤول المتابعة</Label>
              <Select dir={dir} value={assigned} onValueChange={setAssigned} disabled={!staff.isSuccess || save.isPending}>
                <SelectTrigger id="company-assignee"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">بدون مسؤول</SelectItem>
                  {staff.data?.map((member) => <SelectItem key={member.id} value={member.id}><span data-no-translate>{member.label}</span></SelectItem>)}
                  {assigned !== 'unassigned' && !staff.data?.some((member) => member.id === assigned) && (
                    <SelectItem value={assigned} disabled>المسؤول السابق غير متاح</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {staff.isError && <Button type="button" variant="link" onClick={() => staff.refetch()}>إعادة تحميل المسؤولين</Button>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-next-date">موعد المتابعة القادمة</Label>
              <Input id="company-next-date" type="date" dir="ltr" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-note">ملاحظة داخلية</Label>
            <Textarea id="company-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending || !staff.isSuccess || (assigned !== 'unassigned' && !staff.data?.some((member) => member.id === assigned))}>حفظ المتابعة</Button>
            {save.isError && revision !== company.followup_updated_at && (
              <Button type="button" variant="outline" onClick={() => {
                setAssigned(company.assigned_to ?? 'unassigned');
                setNextDate(company.next_followup_at ?? '');
                setNote(company.note ?? '');
                setRevision(company.followup_updated_at);
                save.reset();
              }}>تحميل المتابعة المحفوظة</Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PlatformCompanyFollowup() {
  const [params] = useSearchParams();
  const id = params.get('company');
  const { user } = useOptimizedAuth();
  const { date } = useCompanyFormatting();
  const [page, setPage] = useState(1);
  const valid = id === null || uuid.test(id);
  const companies = useQuery({
    queryKey: ['platform-company-activation', user?.id, id, id ? 1 : page],
    enabled: !!user && valid,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('platform_company_activation', {
        p_organization_id: id ?? undefined,
        p_page: id ? 0 : page - 1,
      }).abortSignal(signal);
      if (error) throw error;
      return data as unknown as { total: number; rows: CompanyActivation[] };
    },
  });
  const selected = id ? companies.data?.rows[0] : undefined;

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-sidebar px-5 py-6 text-sidebar-foreground">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Building2 className="h-5 w-5" aria-hidden="true" />{id ? 'ملف الشركة' : 'متابعة تفعيل الشركات'}
          </h1>
          {!id && <p className="mt-2 text-sm text-sidebar-foreground/80">تجارب تنتهي خلال ٧ أيام والشركة لم تسجّل عرض سعر أو حجز بعد.</p>}
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/platform/organizations">
            <ArrowRight className="ltr:rotate-180" aria-hidden="true" />كل الشركات
          </Link>
        </Button>
      </header>

      {!valid ? <p role="alert">الشركة غير متاحة</p>
        : companies.isPending ? <p role="status">جارٍ تحميل البيانات</p>
        : companies.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
            <p>تعذّر تحميل البيانات</p>
            <Button type="button" variant="outline" size="sm" onClick={() => companies.refetch()}>إعادة المحاولة</Button>
          </div>
        ) : id ? (
          selected ? <>
            <CompanySummary company={selected} />
            <PlatformCompanyContacts organizationId={selected.id} formatDate={date} />
            <FollowupForm key={selected.id} company={selected} />
          </> : <p role="status">الشركة غير متاحة</p>
        ) : (
          <Card>
            <CardContent className="p-4 sm:p-5">
              {!companies.data?.total ? <p>لا توجد شركات تحتاج متابعة تفعيل في الفترة الحالية.</p> : (
                <>
                  <ul className="divide-y divide-border">
                    {!companies.data.rows.length && <li className="py-3"><Button variant="outline" onClick={() => setPage(1)}>العودة لأول صفحة</Button></li>}
                    {companies.data.rows.map((company) => (
                      <li key={company.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <Link className="break-words font-semibold text-primary hover:underline" to={companyProfilePath(company.id)} data-no-translate>{company.name}</Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <CalendarClock className="h-4 w-4" aria-hidden="true" />
                          <span>تنتهي التجربة</span><bdi>{date(company.expires_at)}</bdi>
                          {company.assigned_name ? <bdi data-no-translate>{company.assigned_name}</bdi> : <span>بدون مسؤول</span>}
                          <Badge variant="outline">{company.next_followup_at ? date(company.next_followup_at) : 'بدون موعد متابعة'}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <TablePager page={page} pageCount={Math.ceil(companies.data.total / PAGE_SIZE)} total={companies.data.total} onChange={setPage} />
                </>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
