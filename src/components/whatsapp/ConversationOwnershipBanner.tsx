import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, UserPlus, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import type { WhatsAppConversationOwnership } from '@/hooks/useWhatsAppConversationOwnership';

interface Props {
  ownership: WhatsAppConversationOwnership;
  compact?: boolean;
}

/**
 * Shows the ownership state of a WhatsApp conversation and the action needed
 * (claim / request assignment / take over) before an agent can send anything.
 */
export const ConversationOwnershipBanner: React.FC<Props> = ({ ownership, compact }) => {
  const { status, isManager, assignedEmployeeName, claim, takeOver, requestAssignment, refetch } =
    ownership;

  if (status === 'owned') {
    if (compact) return null;
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
        <UserCheck className="h-3.5 w-3.5" />
        <span>هذه المحادثة مسندة إليك — يمكنك الرد مباشرة.</span>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>جارٍ التحقق من إسناد المحادثة...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          تعذر التحقق من إسناد المحادثة — الإرسال متوقف مؤقتاً.
        </span>
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={refetch}>
          <RefreshCw className="ml-1 h-3 w-3" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (status === 'no_permission') {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>لديك وصول للقراءة فقط — لا تملك صلاحية الرد على محادثات واتساب.</span>
      </div>
    );
  }

  if (status === 'no_employee_link') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>حسابك غير مرتبط بملف موظف نشط — اطلب من المشرف ربط حسابك لتتمكن من استلام المحادثات.</span>
      </div>
    );
  }

  if (status === 'unassigned') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="flex items-center gap-2">
          <UserPlus className="h-3.5 w-3.5" />
          هذه المحادثة غير مسندة لأحد — استلمها أولاً لتتمكن من الإرسال.
        </span>
        <Button
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => claim.mutate()}
          disabled={claim.isPending}
        >
          {claim.isPending ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : null}
          استلام المحادثة
        </Button>
      </div>
    );
  }

  // assigned_to_other
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        المحادثة مسندة إلى {assignedEmployeeName || 'موظف آخر'}
        {isManager ? ' — يمكنك تحويلها إليك.' : ' — اطلب تحويلها إليك للرد.'}
      </span>
      {isManager ? (
        <Button
          size="sm"
          className="h-7 text-[11px]"
          onClick={() => takeOver.mutate()}
          disabled={takeOver.isPending}
        >
          {takeOver.isPending ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : null}
          تحويل المحادثة إليّ
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          onClick={() => requestAssignment.mutate(undefined)}
          disabled={requestAssignment.isPending || requestAssignment.isSuccess}
        >
          {requestAssignment.isPending ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : null}
          {requestAssignment.isSuccess ? 'تم إرسال الطلب' : 'طلب إسناد المحادثة'}
        </Button>
      )}
    </div>
  );
};

export default ConversationOwnershipBanner;
