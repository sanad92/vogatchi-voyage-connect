import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowRight, RefreshCw, MessageCircle, FileText, Receipt, Wallet, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBookingProfitCockpit } from '@/hooks/useBookingProfitCockpit';
import { useWorkspaceVouchers } from '@/hooks/useWorkspaceVouchers';
import { useBookingWorkspace } from '@/hooks/useBookingWorkspace';
import { WorkspaceExecutiveHeader } from '@/components/bookings/workspace/WorkspaceExecutiveHeader';
import { FinancialSummaryStrip } from '@/components/bookings/workspace/FinancialSummaryStrip';
import { SmartNextActionCard } from '@/components/bookings/workspace/SmartNextActionCard';
import { StageStepper } from '@/components/bookings/workspace/StageStepper';
import { OverviewTab } from '@/components/bookings/workspace/OverviewTab';
import { ItineraryTab } from '@/components/bookings/workspace/ItineraryTab';
import { BookingAmendmentsTab } from '@/components/bookings/workspace/BookingAmendmentsTab';
import { FinancialsTab } from '@/components/bookings/workspace/FinancialsTab';
import { DocumentsTab } from '@/components/bookings/workspace/DocumentsTab';
import { WhatsAppTab } from '@/components/bookings/workspace/WhatsAppTab';
import { TasksTab } from '@/components/bookings/workspace/TasksTab';
import { TimelineTab } from '@/components/bookings/workspace/TimelineTab';
import AuditLogViewer from '@/components/audit/AuditLogViewer';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { BookingCancellationDialog, useBookingCancellation } from '@/components/bookings/workspace/BookingCancellationDialog';
import BookingLeadAudit from '@/components/bookings/workspace/BookingLeadAudit';
import { AutomationCenter } from '@/components/bookings/workspace/automation/AutomationCenter';
import { BookingSopTab } from '@/components/bookings/workspace/BookingSopTab';
import {
  bookingCollectionStatus,
  verifiedWorkflowStage,
  deriveProfitHealth,
  type WorkflowContext,
} from '@/lib/bookingWorkflow';

const TAB_KEYS = ['overview', 'itinerary', 'amendments', 'financials', 'documents', 'whatsapp', 'tasks', 'timeline', 'automation', 'sop'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TOOLS: TabKey[] = ['timeline', 'automation', 'sop'];

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'نظرة عامة',
  itinerary: 'البرنامج',
  amendments: 'تعديلات الرحلة',
  financials: 'المالية',
  documents: 'المستندات',
  whatsapp: 'واتساب',
  tasks: 'المهام والملاحظات',
  timeline: 'السجل الزمني',
  automation: 'الأتمتة',
  sop: 'دليل العمل',
};

const BookingWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const workspace = useBookingWorkspace(id);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const { getPermissionScope } = useSupabasePermissions();
  const canSettleCancellation = (['bookings_view', 'bookings_cancel', 'financial_view', 'payments_process'] as const)
    .every(permission => getPermissionScope(permission) === 'organization');
  const canViewFinance = getPermissionScope('financial_view') !== 'none';
  const cockpit = useBookingProfitCockpit(canViewFinance ? id : undefined);
  const vouchers = useWorkspaceVouchers(id);
  const canEditBooking = getPermissionScope('bookings_edit') === 'organization';
  const cancelled = workspace.booking?.workflow_stage === 'cancelled' || ['cancelled', 'canceled'].includes(workspace.booking?.status);
  const cancellation = useBookingCancellation(id, canSettleCancellation && (cancellationOpen || cancelled));

  const activeTab: TabKey = useMemo(() => {
    const t = params.get('tab') as TabKey | null;
    return t && TAB_KEYS.includes(t) ? t : 'overview';
  }, [params]);

  const setTab = (t: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  if (workspace.isLoading) {
    return <div className="p-8 text-center text-muted-foreground">جاري تحميل مساحة العمل...</div>;
  }
  if (!workspace.booking) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-destructive">تعذر تحميل الحجز</p>
        <Button variant="ghost" onClick={() => navigate('/bookings')}>
          <ArrowRight className="h-4 w-4 ml-1" /> رجوع للحجوزات
        </Button>
      </div>
    );
  }

  const summary = cockpit.isError ? undefined : cockpit.data?.summary;
  const profitHealth = summary ? deriveProfitHealth(summary.gross_profit, summary.selling) : undefined;
  const currency = cockpit.data?.booking.currency;
  const activeInvoices = cockpit.data?.drilldowns.invoices.filter(inv =>
    !['draft', 'cancelled', 'canceled', 'void'].includes(inv.status?.toLowerCase() ?? '')
      && Number(inv.amount) > 0,
  ) ?? [];
  const hasInvoice = activeInvoices.length > 0;
  const hasForeignCurrencyInvoice = activeInvoices.some(inv =>
    (inv.currency?.trim().toUpperCase() || currency) !== currency,
  );
  const paymentStatus = hasForeignCurrencyInvoice ? 'unknown' : bookingCollectionStatus(summary, cancelled);
  const stage = cancelled ? 'cancelled' : verifiedWorkflowStage(workspace.booking.workflow_stage, paymentStatus, workspace.booking.status);
  const ctx: WorkflowContext = {
    stage,
    bookingId: id!,
    hasInvoice,
    hasVoucher: !vouchers.isSuccess || vouchers.data.length > 0 || Boolean(workspace.booking.voucher_number),
    paymentStatus,
    canCreateInvoice: getPermissionScope('invoices_create') !== 'none',
    canRecordPayment: getPermissionScope('payments_process') !== 'none',
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')}>
          <ArrowRight className="h-4 w-4 ml-1" /> الحجوزات
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">مساحة العمل</span>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={() => { workspace.refetch(); if (canViewFinance) void cockpit.refetch(); }} title="تحديث">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <WorkspaceExecutiveHeader
        workspace={workspace}
        paymentStatus={canViewFinance ? paymentStatus : undefined}
        profitHealth={profitHealth}
      />
      <StageStepper
        stage={stage}
        paymentVerified={paymentStatus === 'paid'}
        onChange={next => void workspace.setStage(next).catch(() => undefined)}
        editable={canEditBooking && !cancelled}
      />
      <SmartNextActionCard workspace={workspace} ctx={ctx} canEditBooking={canEditBooking} />
      {canViewFinance && <FinancialSummaryStrip cockpit={cockpit} />}

      <div className="flex flex-wrap gap-2">
        {canSettleCancellation && !workspace.booking.is_demo && (
          <Button size="sm" variant="outline" onClick={() => setCancellationOpen(true)}>
            <Ban className="h-4 w-4 ml-1" />
            {cancellation.data?.customer.settled && (cancellation.data.supplier_result || !cancellation.data.suppliers.length) ? 'عرض تسوية الإلغاء' : cancelled ? 'تسوية الإلغاء' : 'إلغاء الحجز'}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setTab('whatsapp')}>
          <MessageCircle className="h-4 w-4 ml-1" /> فتح واتساب
        </Button>
        {!cancelled && <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/new?booking_id=${id}`)}>
          <FileText className="h-4 w-4 ml-1" /> إنشاء فاتورة
        </Button>}
        <Button size="sm" variant="outline" onClick={() => setTab('financials')}>
          <Wallet className="h-4 w-4 ml-1" /> تسجيل دفعة
        </Button>
        <Button size="sm" variant="outline" onClick={() => setTab('documents')}>
          <Receipt className="h-4 w-4 ml-1" /> فاوتشر / مستندات
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="flex h-auto max-w-full flex-wrap justify-start gap-1">
            {TAB_KEYS.filter(key => !TOOLS.includes(key) || key === activeTab).map(key => (
              <TabsTrigger key={key} value={key} className="text-xs md:text-sm">
                {TAB_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm">أدوات الحجز</Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              {TOOLS.map(key => <DropdownMenuItem key={key} onSelect={() => setTab(key)}>{TAB_LABELS[key]}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab workspace={workspace} onOpenTab={setTab} />
        </TabsContent>
        <TabsContent value="itinerary" className="mt-4">
          <ItineraryTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="amendments" className="mt-4">
          {id && <BookingAmendmentsTab bookingId={id} bookingCurrency={workspace.booking.currency}
            customerId={workspace.booking.customer_id} itinerary={workspace.itinerary} />}
        </TabsContent>
        <TabsContent value="financials" className="mt-4">
          <FinancialsTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TasksTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4 space-y-4">
          <BookingLeadAudit bookingId={id} />
          <TimelineTab workspace={workspace} />
          {id && <AuditLogViewer targetTable="bookings" targetId={id} title="سجل التدقيق" compact showFilters={false} />}
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          {id && <AutomationCenter bookingId={id} />}
        </TabsContent>
        <TabsContent value="sop" className="mt-4">
          {id && <BookingSopTab bookingId={id} />}
        </TabsContent>
      </Tabs>
      {id && cancellationOpen && <BookingCancellationDialog bookingId={id} cancelled={cancelled}
        preview={cancellation.data} loadError={cancellation.error} onReload={() => { void cancellation.refetch(); }}
        onClose={() => setCancellationOpen(false)} onSettled={workspace.refetch} />}
    </div>
  );
};


export default BookingWorkspace;
