import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Phone, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { contactGapLabels, loadPlatformContactGaps } from '@/lib/platformCompanyFollowup';

interface CompanyContact {
  id: string;
  role: 'owner' | 'admin';
  joined_at: string;
  name: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  work_phone: string | null;
}

interface CompanyContacts {
  email: string | null;
  phone: string | null;
  address: string | null;
  contacts: CompanyContact[];
}

function ContactField({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children ?? <span className="text-muted-foreground">غير مسجّل</span>}</dd>
    </div>
  );
}

function ContactLink({ value, type }: { value: string; type: 'tel' | 'mailto' }) {
  const Icon = type === 'tel' ? Phone : Mail;
  const target = type === 'tel' ? value.replace(/[\s().-]/g, '') : value;
  const valid = type === 'tel' ? /^\+?[0-9]{3,20}$/.test(target) : /^[^\s@?&#]+@[^\s@?&#]+$/.test(target);
  return valid ? (
    <a href={`${type}:${target}`} className="inline-flex max-w-full items-center gap-1.5 text-primary underline underline-offset-2">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <bdi className="break-all" data-no-translate>{value}</bdi>
    </a>
  ) : <bdi data-no-translate>{value}</bdi>;
}

export function PlatformCompanyContacts({ organizationId, formatDate }: {
  organizationId: string;
  formatDate: (value: string) => string;
}) {
  const { user } = useOptimizedAuth();
  const contactGaps = useQuery({
    queryKey: ['platform-company-contact-gaps', user?.id],
    enabled: !!user,
    queryFn: ({ signal }) => loadPlatformContactGaps(signal),
    staleTime: 30_000,
  });
  const details = useQuery({
    queryKey: ['platform-company-contacts', user?.id, organizationId],
    enabled: !!user,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('platform_company_contacts', {
        p_organization_id: organizationId,
      }).abortSignal(signal);
      if (error) throw error;
      return data as unknown as CompanyContacts | null;
    },
  });

  if (details.isPending) return <p className="text-sm text-muted-foreground" role="status">جارٍ تحميل بيانات التواصل</p>;
  if (details.isError || !details.data) return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-destructive" role="alert">
        <p>تعذّر تحميل بيانات التواصل</p>
        <Button type="button" variant="outline" size="sm" onClick={() => details.refetch()}>إعادة المحاولة</Button>
      </CardContent>
    </Card>
  );

  const { email, phone, address, contacts } = details.data;
  const missingFields = contactGaps.data?.find((row) => row.organization_id === organizationId)?.fields;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {!!missingFields?.length && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm lg:col-span-2">
          <span className="font-semibold">بيانات التواصل ناقصة</span>
          {missingFields.map((field) => <Badge key={field} variant="outline">{contactGapLabels[field]}</Badge>)}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />بيانات المؤسسة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <ContactField label="هاتف المؤسسة">{phone && <ContactLink type="tel" value={phone} />}</ContactField>
            <ContactField label="بريد المؤسسة">{email && <ContactLink type="mailto" value={email} />}</ContactField>
            <ContactField label="عنوان المؤسسة">{address && <bdi data-no-translate>{address}</bdi>}</ContactField>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />مسؤولو المؤسسة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد مالك أو مدير نشط مسجّل</p> : (
            <ul className="space-y-3">
              {contacts.map((contact) => (
                <li key={contact.id} className="min-w-0 space-y-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="min-w-0 break-words text-sm font-semibold">
                      {contact.name ? <bdi data-no-translate>{contact.name}</bdi> : 'الاسم غير مسجّل'}
                    </h4>
                    <Badge variant="secondary">{contact.role === 'owner' ? 'مالك المؤسسة' : 'مدير المؤسسة'}</Badge>
                    {contact.position && <bdi className="break-words text-xs text-muted-foreground" data-no-translate>{contact.position}</bdi>}
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <ContactField label="بريد المسؤول">{contact.email && <ContactLink type="mailto" value={contact.email} />}</ContactField>
                    <ContactField label="هاتف المسؤول">{contact.phone && <ContactLink type="tel" value={contact.phone} />}</ContactField>
                    {contact.work_phone && contact.work_phone !== contact.phone && (
                      <ContactField label="هاتف العمل"><ContactLink type="tel" value={contact.work_phone} /></ContactField>
                    )}
                    <ContactField label="تاريخ الانضمام"><bdi>{formatDate(contact.joined_at)}</bdi></ContactField>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
