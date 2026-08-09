import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import LeadIntakeForm from '@/components/sop/LeadIntakeForm';
import { useSopLeadForConversation } from '@/hooks/useSop';
import { useState } from 'react';

interface Props {
  conversationId: string;
  conversation: any;
}

/** SOP cockpit inside the WhatsApp inbox: intake, ownership, next required action. */
export const WhatsAppSOPPanel = ({ conversationId, conversation }: Props) => {
  const { data: lead, isLoading } = useSopLeadForConversation(conversationId);
  const [creating, setCreating] = useState(false);

  if (isLoading) return <p className="p-3 text-xs text-muted-foreground">جاري التحميل…</p>;

  if (!lead && !creating) {
    return (
      <Card className="m-3">
        <CardContent className="p-4 space-y-3 text-center">
          <p className="text-xs text-muted-foreground">
            لا يوجد ملف عميل محتمل مرتبط بهذه المحادثة حسب دليل العمل.
          </p>
          <Button size="sm" onClick={() => setCreating(true)}>
            <UserPlus className="h-3.5 w-3.5 ml-1" /> فتح ملف استقبال
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!lead) {
    return (
      <div className="p-3">
        <LeadIntakeForm
          defaults={{
            conversation_id: conversationId,
            customer_id: conversation?.customer_id ?? null,
            contact_name: conversation?.customer_name || conversation?.contact_name || '',
            contact_phone: conversation?.customer_phone || conversation?.phone_number || '',
            lead_source: 'whatsapp',
          }}
          onSaved={() => setCreating(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <SopLeadPanel leadId={lead.id} compact />
    </div>
  );
};

export default WhatsAppSOPPanel;
