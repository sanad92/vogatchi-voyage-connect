import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeftRight, CheckCircle2, ChevronDown, ExternalLink, HandCoins, RefreshCcw,
  Send, ShieldCheck, UserPlus, UserRoundCheck,
} from 'lucide-react';
import {
  useAcknowledgeAssignment,
  useAdvanceLead,
  useAssignLead,
  useClaimLead,
  useCollectionStatus,
  useCreatePricingRequest,
  useConvertLeadToCustomer,
  useLeadAssignments,
  useMyDepartments,
  useRequestApproval,
  useRequestRecheck,
  useSopLead,
  useTransitionCheck,
} from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import HandoverDialog from './HandoverDialog';
import LeadActivityPanel from './LeadActivityPanel';
import SopGateAlert from './SopGateAlert';
import SopLeadBrief from './SopLeadBrief';
import SopPricingResult from './SopPricingResult';
import SopStageActions from './SopStageActions';
import LeadAuditTimeline from './LeadAuditTimeline';
import {
  DEPARTMENT_LABELS,
  LEAD_STAGE_LABELS,
  nextRequiredAction,
  type SopHandoverType,
  type SopLeadStage,
} from '@/lib/sop';

/**
 * Maps the current stage to the transition the user is expected to take next.
 * `new` has no advance target on purpose: a Sales user must claim the lead first,
 * and only the claiming owner then decides qualification.
 */
const NEXT_STAGE: Partial<Record<SopLeadStage, SopLeadStage>> = {
  assigned: 'qualified',
  qualified: 'pricing_requested',
  pricing_requested: 'quoted',
  quoted: 'accepted_pending_recheck',
  follow_up: 'accepted_pending_recheck',
  accepted_pending_recheck: 'rechecked',
  rechecked: 'payment_pending',
  payment_pending: 'won',
};

const HANDOVER_FOR_STAGE: Partial<Record<SopLeadStage, SopHandoverType>> = {
  new: 'cs_to_sales',
  qualified: 'sales_to_reservations',
  pricing_requested: 'reservations_to_sales',
  won: 'reservations_to_cs',
};

interface Props {
  leadId: string;
  compact?: boolean;
}

/** Shared SOP cockpit: owner, stage, missing data, next required action. */
export const SopLeadPanel = ({ leadId, compact }: Props) => {
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const { has, isManager } = useMyDepartments();
  const { data: lead } = useSopLead(leadId);
  const { data: assignments } = useLeadAssignments(leadId);
  const { members } = useOrgMembers();
  const nextStage = lead ? NEXT_STAGE[lead.stage] : undefined;
  const { data: gate } = useTransitionCheck(leadId, nextStage);
  const { data: collection } = useCollectionStatus(leadId);

  const advance = useAdvanceLead();
  const assign = useAssignLead();
  const claim = useClaimLead();
  const ack = useAcknowledgeAssignment();
  const pricing = useCreatePricingRequest();
  const recheck = useRequestRecheck();
  const approval = useRequestApproval();
  const convert = useConvertLeadToCustomer();

  const [handoverOpen, setHandoverOpen] = useState<SopHandoverType | null>(null);

  if (!lead) return null;

  const current = (assignments || []).find((assignment) => assignment.is_current);
  const ownerName = members.find((m) => m.user_id === lead.current_owner_id)?.profile?.full_name;
  const handoverType = HANDOVER_FOR_STAGE[lead.stage];
  const canManage = isManager || lead.current_owner_id === user?.id;
  const canAssign = has('customer_service');
  const canClaim = has('sales');
  const canConvert = canManage || has('customer_service');
  const handoverDepartment = handoverType === 'cs_to_sales'
    ? 'customer_service'
    : handoverType === 'sales_to_reservations'
      ? 'sales'
      : 'reservations';
  const canHandover = !!handoverType && has(handoverDepartment);

  type Action = { label: string; icon?: JSX.Element; onClick: () => void; disabled?: boolean };
  const actions: Action[] = [];

  // Self-claim is the normal path: an available Sales member takes the lead themselves.
  const claimable = !lead.current_owner_id && ['new', 'assigned', 'qualified'].includes(lead.stage);
  if (claimable && canClaim) {
    actions.push({
      label: 'استلم العميل',
      icon: <HandCoins className="h-3.5 w-3.5 ml-1" />,
      onClick: () => claim.mutate(leadId),
      disabled: claim.isPending,
    });
  }

  if (handoverType && canHandover) {
    actions.push({
      label: 'تسليم للزميل',
      icon: <ArrowLeftRight className="h-3.5 w-3.5 ml-1" />,
      onClick: () => setHandoverOpen(handoverType),
    });
  }
  if (lead.stage === 'new' && canAssign) {
    actions.push({
      label: 'إسناد بالتناوب',
      icon: <UserPlus className="h-3.5 w-3.5 ml-1" />,
      onClick: () => assign.mutate({ leadId }),
    });
  }
  // Pricing is unlocked only after the Sales owner qualified the lead.
  if (canManage && (lead.stage === 'qualified' || lead.stage === 'quoted' || lead.stage === 'follow_up')) {
    actions.push({
      label: 'طلب تسعير',
      icon: <Send className="h-3.5 w-3.5 ml-1" />,
      onClick: () => pricing.mutate({ leadId }),
    });
  }
  if (canManage && lead.stage === 'accepted_pending_recheck') {
    actions.push({
      label: 'طلب إعادة تأكد',
      icon: <RefreshCcw className="h-3.5 w-3.5 ml-1" />,
      onClick: () => recheck.mutate({ leadId }),
    });
  }
  if (canManage && (lead.stage === 'rechecked' || lead.stage === 'payment_pending')) {
    actions.push({
      label: 'طلب موافقة الإدارة',
      icon: <ShieldCheck className="h-3.5 w-3.5 ml-1" />,
      onClick: () => approval.mutate({ type: 'booking_confirmation', leadId, reason: 'تأكيد الحجز' }),
    });
  }
  if (nextStage && canManage) {
    const acceptance = nextStage === 'accepted_pending_recheck';
    const qualification = nextStage === 'qualified';
    actions.push({
      label: acceptance ? 'العميل وافق'
        : qualification ? 'عميل مؤهل'
        : `تأكيد: ${LEAD_STAGE_LABELS[nextStage]}`,
      icon: <CheckCircle2 className="h-3.5 w-3.5 ml-1" />,
      onClick: () => advance.mutate({ leadId, to: nextStage }, {
        // Acceptance immediately opens the recheck task for Reservations.
        onSuccess: (result) => { if (acceptance && result?.allowed !== false) recheck.mutate({ leadId }); },
      }),
      disabled: advance.isPending || !gate?.allowed,
    });
  }
  if (!lead.customer_id && canConvert) {
    actions.push({
      label: 'تحويل إلى عميل',
      icon: <UserRoundCheck className="h-3.5 w-3.5 ml-1" />,
      onClick: () => convert.mutate(leadId),
      disabled: convert.isPending || !lead.contact_phone,
    });
  }

  // The gate decides what the user should do right now.
  const advanceAction = nextStage
    ? actions.find((a) => a.label.startsWith('تأكيد:') || a.label === 'العميل وافق' || a.label === 'عميل مؤهل')
    : undefined;
  const claimAction = actions.find((a) => a.label === 'استلم العميل');
  const primary = claimAction
    || (gate?.allowed && advanceAction ? advanceAction : actions.find((a) => a.label !== 'تسليم للزميل') || actions[0]);
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
          {lead.lead_number && <Badge variant="outline" dir="ltr">{lead.lead_number}</Badge>}
          {lead.requote_required && <Badge variant="destructive">مطلوب إعادة تسعير</Badge>}
          {lead.is_legacy && <Badge variant="outline">سجل تاريخي</Badge>}
          {lead.customer_id && (
            <Button
              size="sm"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => navigate(`/customers/${lead.customer_id}`)}
            >
              ملف العميل <ExternalLink className="h-3 w-3 mr-1" />
            </Button>
          )}
        </div>

        <div className="rounded-md border bg-muted/40 p-2 text-xs">
          <span className="text-muted-foreground">الخطوة التالية: </span>
          <span className="font-medium">{nextRequiredAction(lead.stage)}</span>
        </div>

        {current && current.assignee_id === user?.id && !current.acknowledged_at && (
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
              !gate?.allowed && handoverType && canHandover
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

        <SopStageActions
          leadId={leadId}
          stage={lead.stage}
          canManage={canManage}
          canMoveBack={isManager}
        />

      </CardContent>

      {handoverOpen && (
        <HandoverDialog open onClose={() => setHandoverOpen(null)} leadId={leadId} type={handoverOpen} />
      )}
    </Card>

    <SopLeadBrief lead={lead} />
    <LeadActivityPanel lead={lead} canManage={canManage || has('customer_service')} />
    <SopPricingResult leadId={leadId} />
    <LeadAuditTimeline leadId={leadId} compact={compact} />

    </div>
  );
};

export default SopLeadPanel;
