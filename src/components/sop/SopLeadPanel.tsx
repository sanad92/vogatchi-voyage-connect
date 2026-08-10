import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeftRight, CheckCircle2, ChevronDown, RefreshCcw, Send, ShieldCheck, UserPlus,
} from 'lucide-react';
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
import SopLeadBrief from './SopLeadBrief';
import SopPricingResult from './SopPricingResult';
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

  type Action = { label: string; icon?: JSX.Element; onClick: () => void; disabled?: boolean };
  const actions: Action[] = [];

  if (handoverType) {
    actions.push({
      label: 'تسليم للزميل',
      icon: <ArrowLeftRight className="h-3.5 w-3.5 ml-1" />,
      onClick: () => setHandoverOpen(handoverType),
    });
  }
  if (lead.stage === 'qualified') {
    actions.push({
      label: 'إسناد بالتناوب',
      icon: <UserPlus className="h-3.5 w-3.5 ml-1" />,
      onClick: () => assign.mutate({ leadId }),
    });
  }
  if (lead.stage === 'assigned' || lead.stage === 'quoted' || lead.stage === 'follow_up') {
    actions.push({
      label: 'طلب تسعير',
      icon: <Send className="h-3.5 w-3.5 ml-1" />,
      onClick: () => pricing.mutate({ leadId }),
    });
  }
  if (lead.stage === 'accepted_pending_recheck') {
    actions.push({
      label: 'طلب إعادة تأكد',
      icon: <RefreshCcw className="h-3.5 w-3.5 ml-1" />,
      onClick: () => recheck.mutate({ leadId }),
    });
  }
  if (lead.stage === 'rechecked' || lead.stage === 'payment_pending') {
    actions.push({
      label: 'طلب موافقة الإدارة',
      icon: <ShieldCheck className="h-3.5 w-3.5 ml-1" />,
      onClick: () => approval.mutate({ type: 'booking_confirmation', leadId, reason: 'تأكيد الحجز' }),
    });
  }
  if (nextStage) {
    actions.push({
      label: `تأكيد: ${LEAD_STAGE_LABELS[nextStage]}`,
      icon: <CheckCircle2 className="h-3.5 w-3.5 ml-1" />,
      onClick: () => advance.mutate({ leadId, to: nextStage }),
      disabled: advance.isPending || !gate?.allowed,
    });
  }
  if (!compact && lead.stage !== 'lost' && lead.stage !== 'won') {
    actions.push({
      label: 'تسجيل كمفقود',
      onClick: () => {
        const reason = window.prompt('سبب الفقد (إلزامي)');
        if (reason) advance.mutate({ leadId, to: 'lost', reason });
      },
    });
  }

  // The gate decides what the user should do right now.
  const advanceAction = nextStage ? actions.find((a) => a.label.startsWith('تأكيد:')) : undefined;
  const primary = gate?.allowed && advanceAction ? advanceAction : actions[0];
  const others = actions.filter((a) => a !== primary);

  return (
    <div className="space-y-3">
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

        <div className="rounded-md border bg-muted/40 p-2 text-xs">
          <span className="text-muted-foreground">الخطوة التالية: </span>
          <span className="font-medium">{nextRequiredAction(lead.stage)}</span>
        </div>

        {current && !current.acknowledged_at && (
          <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 p-2 text-xs">
            <span>بانتظار استلامك قبل {new Date(current.ack_deadline_at).toLocaleString('ar-EG')}</span>
            <Button size="sm" onClick={() => ack.mutate(leadId)}>استلام</Button>
          </div>
        )}

        {nextStage && (
          <SopGateAlert
            gate={gate}
            okLabel={`جاهز للانتقال إلى: ${LEAD_STAGE_LABELS[nextStage]}`}
            compact
            action={
              !gate?.allowed && handoverType
                ? { label: 'افتح نافذة التسليم', onClick: () => setHandoverOpen(handoverType) }
                : null
            }
          />
        )}

        {collection && (lead.stage === 'payment_pending' || lead.stage === 'rechecked') && (
          <div className="rounded-md border p-2 text-xs space-y-1">
            <div>سياسة الدفع: {collection.policy}</div>
            <div>المطلوب تحصيله: {Number(collection.required).toLocaleString()} — المحصّل: {Number(collection.paid).toLocaleString()}</div>
          </div>
        )}

        <Separator />

        {/* Primary action first, everything else tucked away */}
        <div className="flex flex-wrap items-center gap-2">
          {primary && (
            <Button size="sm" onClick={primary.onClick} disabled={primary.disabled}>
              {primary.icon} {primary.label}
            </Button>
          )}

          {others.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  إجراءات أخرى <ChevronDown className="h-3.5 w-3.5 mr-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {others.map((a) => (
                  <DropdownMenuItem key={a.label} onClick={a.onClick} disabled={a.disabled}>
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>



      </CardContent>

      {handoverOpen && (
        <HandoverDialog open onClose={() => setHandoverOpen(null)} leadId={leadId} type={handoverOpen} />
      )}
    </Card>
  );
};

export default SopLeadPanel;
