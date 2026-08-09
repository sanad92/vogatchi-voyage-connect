import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftRight, CheckCircle2, RefreshCcw, Send, ShieldCheck, UserPlus } from 'lucide-react';
import {
  useAcknowledgeAssignment,
  useAdvanceLead,
  useAssignLead,
  useCollectionStatus,
  useCreatePricingRequest,
  useLeadAssignments,
  useRequestApproval,
  useRequestRecheck,
  useSopLead,
  useTransitionCheck,
} from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import HandoverDialog from './HandoverDialog';
import SopGateAlert from './SopGateAlert';
import {
  DEPARTMENT_LABELS,
  LEAD_STAGE_LABELS,
  nextRequiredAction,
  type SopHandoverType,
  type SopLeadStage,
} from '@/lib/sop';

/** Maps the current stage to the transition the user is expected to take next. */
const NEXT_STAGE: Partial<Record<SopLeadStage, SopLeadStage>> = {
  new: 'qualified',
  qualified: 'assigned',
  assigned: 'pricing_requested',
  pricing_requested: 'quoted',
  quoted: 'accepted_pending_recheck',
  follow_up: 'accepted_pending_recheck',
  accepted_pending_recheck: 'rechecked',
  rechecked: 'payment_pending',
  payment_pending: 'won',
};

const HANDOVER_FOR_STAGE: Partial<Record<SopLeadStage, SopHandoverType>> = {
  new: 'cs_to_sales',
  qualified: 'cs_to_sales',
  assigned: 'sales_to_reservations',
  pricing_requested: 'reservations_to_sales',
  won: 'reservations_to_cs',
};

interface Props {
  leadId: string;
  compact?: boolean;
}

/** Shared SOP cockpit: owner, stage, missing data, next required action. */
export const SopLeadPanel = ({ leadId, compact }: Props) => {
  const { data: lead } = useSopLead(leadId);
  const { data: assignments } = useLeadAssignments(leadId);
  const { members } = useOrgMembers();
  const nextStage = lead ? NEXT_STAGE[lead.stage] : undefined;
  const { data: gate } = useTransitionCheck(leadId, nextStage);
  const { data: collection } = useCollectionStatus(leadId);

  const advance = useAdvanceLead();
  const assign = useAssignLead();
  const ack = useAcknowledgeAssignment();
  const pricing = useCreatePricingRequest();
  const recheck = useRequestRecheck();
  const approval = useRequestApproval();

  const [handoverOpen, setHandoverOpen] = useState<SopHandoverType | null>(null);

  if (!lead) return null;

  const current = (assignments || []).find((a: any) => a.is_current);
  const ownerName = members.find((m) => m.user_id === lead.current_owner_id)?.profile?.full_name;
  const handoverType = HANDOVER_FOR_STAGE[lead.stage];

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> دليل العمل — حالة الملف
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{LEAD_STAGE_LABELS[lead.stage]}</Badge>
          <Badge variant="outline">{DEPARTMENT_LABELS[lead.owner_department]}</Badge>
          <span className="text-muted-foreground">
            المسؤول: {ownerName || (lead.current_owner_id ? lead.current_owner_id.slice(0, 8) : 'غير محدد')}
          </span>
          {lead.requote_required && <Badge variant="destructive">مطلوب إعادة تسعير</Badge>}
          {lead.is_legacy && <Badge variant="outline">سجل تاريخي</Badge>}
        </div>

        <div className="text-xs text-muted-foreground">
          الإجراء المطلوب: <span className="text-foreground">{nextRequiredAction(lead.stage)}</span>
        </div>

        {current && !current.acknowledged_at && (
          <div className="flex items-center justify-between rounded-md border p-2 text-xs">
            <span>بانتظار استلام الإسناد قبل {new Date(current.ack_deadline_at).toLocaleString('ar-EG')}</span>
            <Button size="sm" variant="outline" onClick={() => ack.mutate(leadId)}>استلام</Button>
          </div>
        )}

        {nextStage && <SopGateAlert gate={gate} okLabel={`جاهز للانتقال إلى: ${LEAD_STAGE_LABELS[nextStage]}`} compact />}

        {collection && (lead.stage === 'payment_pending' || lead.stage === 'rechecked') && (
          <div className="rounded-md border p-2 text-xs space-y-1">
            <div>سياسة الدفع: {collection.policy}</div>
            <div>المطلوب تحصيله: {Number(collection.required).toLocaleString()} — المحصّل: {Number(collection.paid).toLocaleString()}</div>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          {handoverType && (
            <Button size="sm" variant="outline" onClick={() => setHandoverOpen(handoverType)}>
              <ArrowLeftRight className="h-3.5 w-3.5 ml-1" /> تسليم
            </Button>
          )}
          {lead.stage === 'qualified' && (
            <Button size="sm" variant="outline" onClick={() => assign.mutate({ leadId })}>
              <UserPlus className="h-3.5 w-3.5 ml-1" /> إسناد بالتناوب
            </Button>
          )}
          {(lead.stage === 'assigned' || lead.stage === 'quoted' || lead.stage === 'follow_up') && (
            <Button size="sm" variant="outline" onClick={() => pricing.mutate({ leadId })}>
              <Send className="h-3.5 w-3.5 ml-1" /> طلب تسعير
            </Button>
          )}
          {lead.stage === 'accepted_pending_recheck' && (
            <Button size="sm" variant="outline" onClick={() => recheck.mutate({ leadId })}>
              <RefreshCcw className="h-3.5 w-3.5 ml-1" /> طلب إعادة تأكد
            </Button>
          )}
          {(lead.stage === 'rechecked' || lead.stage === 'payment_pending') && (
            <Button
              size="sm" variant="outline"
              onClick={() => approval.mutate({ type: 'booking_confirmation', leadId, reason: 'تأكيد الحجز' })}
            >
              <ShieldCheck className="h-3.5 w-3.5 ml-1" /> طلب موافقة الإدارة
            </Button>
          )}
          {nextStage && (
            <Button
              size="sm"
              disabled={advance.isPending || !gate?.allowed}
              onClick={() => advance.mutate({ leadId, to: nextStage })}
            >
              <CheckCircle2 className="h-3.5 w-3.5 ml-1" /> {LEAD_STAGE_LABELS[nextStage]}
            </Button>
          )}
        </div>

        {!compact && lead.stage !== 'lost' && lead.stage !== 'won' && (
          <Button
            size="sm" variant="ghost" className="text-destructive"
            onClick={() => {
              const reason = window.prompt('سبب الفقد (إلزامي)');
              if (reason) advance.mutate({ leadId, to: 'lost', reason });
            }}
          >
            تسجيل كمفقود
          </Button>
        )}
      </CardContent>

      {handoverOpen && (
        <HandoverDialog open onClose={() => setHandoverOpen(null)} leadId={leadId} type={handoverOpen} />
      )}
    </Card>
  );
};

export default SopLeadPanel;
