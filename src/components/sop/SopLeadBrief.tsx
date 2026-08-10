import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, User } from 'lucide-react';
import type { SopLead } from '@/hooks/useSop';

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => {
  if (value === null || value === undefined || value === '' ) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-end break-words">{value}</span>
    </div>
  );
};

/** Customer + trip brief so Sales can read the full request without leaving the panel. */
export const SopLeadBrief = ({ lead }: { lead: SopLead }) => {
  const dates = lead.check_in
    ? `${new Date(lead.check_in).toLocaleDateString('ar-EG')} → ${
        lead.check_out ? new Date(lead.check_out).toLocaleDateString('ar-EG') : '—'
      }`
    : lead.approx_dates || undefined;

  const pax = [
    lead.adults ? `${lead.adults} بالغ` : null,
    lead.children_count ? `${lead.children_count} طفل` : null,
    lead.rooms ? `${lead.rooms} غرفة` : null,
  ].filter(Boolean).join(' • ') || undefined;

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" /> بيانات العميل والطلب
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{lead.contact_name || 'بدون اسم'}</span>
          {lead.contact_phone && (
            <a href={`tel:${lead.contact_phone}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Phone className="h-3 w-3" /> {lead.contact_phone}
            </a>
          )}
          {lead.contact_email && (
            <a href={`mailto:${lead.contact_email}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Mail className="h-3 w-3" /> {lead.contact_email}
            </a>
          )}
          {lead.lead_source && <Badge variant="outline" className="text-[10px]">{lead.lead_source}</Badge>}
        </div>

        <div className="grid gap-1.5 border-t pt-2">
          <Row label="الوجهة" value={[lead.destination, lead.city].filter(Boolean).join(' - ') || undefined} />
          <Row label="التواريخ" value={dates} />
          <Row label="عدد المسافرين" value={pax} />
          <Row label="أعمار الأطفال" value={lead.children_ages?.length ? lead.children_ages.join(', ') : undefined} />
          <Row label="نوع الخدمة" value={lead.service_type} />
          <Row label="الإقامة/التوزيع" value={lead.occupancy} />
          <Row label="الجنسية" value={lead.nationality} />
          <Row label="السوق" value={lead.market} />
          <Row label="مستوى الميزانية" value={lead.budget_level} />
          <Row
            label="الميزانية التقريبية"
            value={lead.budget_amount ? Number(lead.budget_amount).toLocaleString() : undefined}
          />
          <Row label="الأولويات" value={lead.priorities} />
          <Row label="فندق مرجعي" value={lead.reference_hotel} />
          <Row label="طلبات خاصة" value={lead.special_requests} />
          <Row label="سياسة الدفع" value={lead.payment_policy} />
          <Row label="نسبة العربون" value={lead.deposit_percent ? `${lead.deposit_percent}%` : undefined} />
        </div>

        {lead.reference_screenshot_url && (
          <a
            href={lead.reference_screenshot_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-primary underline"
          >
            عرض الصورة المرفقة
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default SopLeadBrief;
