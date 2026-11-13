import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import LeadIntakeForm from '@/components/sop/LeadIntakeForm';
import { useSopLeadForConversation, type SopLead } from '@/hooks/useSop';
import { useSalesBrief, type SalesBriefRow } from '@/hooks/useSalesBrief';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useOrgId } from '@/hooks/useOrgId';
import { useState } from 'react';

interface Props {
  conversationId: string;
  conversation: {
    customer_name?: string | null;
    contact_name?: string | null;
    customer_phone?: string | null;
    phone_number?: string | null;
    customer?: { name?: string | null; email?: string | null } | null;
  };
}

const intakeDefaults = (brief: SalesBriefRow | null): Partial<SopLead> => {
  if (!brief) return {};
  const agesText = brief.children_ages?.trim();
  const ages = agesText && /^[0-9]+(?:[\s,،]+[0-9]+)*$/.test(agesText)
    ? agesText.split(/[\s,،]+/).map(Number)
    : [];
  const agesMatch = ages.length === brief.children && ages.every((age) => age >= 0 && age <= 17);
  const type = brief.trip_type?.trim().toLowerCase();
  const supportedType = type && ['hotel', 'flight', 'package', 'transport', 'other'].includes(type);
  const travelFrom = brief.travel_from?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  const travelTo = brief.travel_to?.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  return {
    destination: brief.destination,
    check_in: travelFrom,
    check_out: travelTo,
    adults: Number.isInteger(brief.adults) && (brief.adults ?? 0) > 0 ? brief.adults : null,
    ...(agesMatch && { children_count: ages.length, children_ages: ages }),
    ...(supportedType && { service_type: type }),
    priorities: brief.board_preference,
    special_requests: [
      brief.notes,
      brief.budget_range && `الميزانية المذكورة: ${brief.budget_range}`,
      !agesMatch && (brief.children ?? 0) > 0 && `عدد الأطفال المذكور: ${brief.children}`,
      !agesMatch && agesText && `الأعمار المذكورة: ${agesText}`,
      type && !supportedType && `نوع الرحلة المذكور: ${brief.trip_type}`,
    ].filter(Boolean).join('\n') || null,
  };
};

export const WhatsAppSOPPanel = (props: Props) => {
  const orgId = useOrgId();
  return <WhatsAppConversationIntake key={`${orgId}:${props.conversationId}`} {...props} />;
};

const WhatsAppConversationIntake = ({ conversationId, conversation }: Props) => {
  const { data: lead, isLoading, isError } = useSopLeadForConversation(conversationId);
  const { brief, isLoading: briefLoading } = useSalesBrief(conversationId);
  const { hasPermission } = usePermissionCheck();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <p className="p-3 text-xs text-muted-foreground">جاري التحميل…</p>;

  if (isError) return <p className="p-3 text-xs">تعذر تحميل ملف الاستقبال.</p>;

  if (!lead && !creating) {
    return (
      <Card className="m-3">
        <CardContent className="p-4 space-y-3 text-center">
          <p className="text-xs text-muted-foreground">
            لا يوجد ملف عميل محتمل مرتبط بهذه المحادثة حسب دليل العمل.
          </p>
          {hasPermission('quotes_create') && <Button asChild variant="outline" size="sm">
            <Link to={`/quotes/new?whatsapp_conversation=${encodeURIComponent(conversationId)}`}>إنشاء عرض سعر</Link>
          </Button>}
          {hasPermission('crm_create') && hasPermission('crm_view') && (
            <Button size="sm" disabled={briefLoading} onClick={() => setCreating(true)}>
              <UserPlus className="h-3.5 w-3.5 ml-1" /> فتح ملف استقبال
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!lead) {
    return (
      <div className="p-3 space-y-2">
        {brief && <p className="text-xs text-muted-foreground">راجع البيانات المقترحة من ملخص المبيعات قبل الحفظ.</p>}
        <LeadIntakeForm
          defaults={{
            ...intakeDefaults(brief),
            conversation_id: conversationId,
            contact_name: conversation.customer?.name || conversation.customer_name || conversation.contact_name || '',
            contact_phone: conversation.customer_phone || conversation.phone_number || '',
            contact_email: conversation.customer?.email,
            lead_source: 'whatsapp',
          }}
          onSaved={() => setCreating(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {hasPermission('quotes_create') && <Button asChild variant="outline" size="sm">
        <Link to={`/quotes/new?whatsapp_conversation=${encodeURIComponent(conversationId)}`}>إنشاء عرض سعر</Link>
      </Button>}
      <SopLeadPanel leadId={lead.id} compact />
    </div>
  );
};

export default WhatsAppSOPPanel;
