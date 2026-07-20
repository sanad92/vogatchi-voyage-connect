import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, RefreshCw, MessageCircle, FileText, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useBookingWorkspace } from '@/hooks/useBookingWorkspace';
import { WorkspaceExecutiveHeader } from '@/components/bookings/workspace/WorkspaceExecutiveHeader';
import { FinancialSummaryStrip } from '@/components/bookings/workspace/FinancialSummaryStrip';
import { SmartNextActionCard } from '@/components/bookings/workspace/SmartNextActionCard';
import { StageStepper } from '@/components/bookings/workspace/StageStepper';
import { OverviewTab } from '@/components/bookings/workspace/OverviewTab';
import { ItineraryTab } from '@/components/bookings/workspace/ItineraryTab';
import { FinancialsTab } from '@/components/bookings/workspace/FinancialsTab';
import { DocumentsTab } from '@/components/bookings/workspace/DocumentsTab';
import { WhatsAppTab } from '@/components/bookings/workspace/WhatsAppTab';
import { TasksTab } from '@/components/bookings/workspace/TasksTab';
import { TimelineTab } from '@/components/bookings/workspace/TimelineTab';
import { AutomationCenter } from '@/components/bookings/workspace/automation/AutomationCenter';
import {
  derivePaymentStatus,
  deriveProfitHealth,
  type WorkflowContext,
} from '@/lib/bookingWorkflow';

const TAB_KEYS = ['overview', 'itinerary', 'financials', 'documents', 'whatsapp', 'tasks', 'timeline', 'automation'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'نظرة عامة',
  itinerary: 'البرنامج',
  financials: 'المالية',
  documents: 'المستندات',
  whatsapp: 'واتساب',
  tasks: 'المهام والملاحظات',
  timeline: 'السجل الزمني',
  automation: 'الأتمتة',
};

const BookingWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const workspace = useBookingWorkspace(id);

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
      <div className="p-8 text-center space-y-3" dir="rtl">
        <p className="text-destructive">تعذر تحميل الحجز</p>
        <Button variant="ghost" onClick={() => navigate('/bookings')}>
          <ArrowRight className="h-4 w-4 ml-1" /> رجوع للحجوزات
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      {/* Back link + legacy view */}
      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')}>
          <ArrowRight className="h-4 w-4 ml-1" /> الحجوزات
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">مساحة العمل</span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => navigate(`/bookings/${id}`)}>
          العرض الكلاسيكي
        </Button>
        <Button variant="ghost" size="icon" onClick={() => workspace.refetch()} title="تحديث">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {(() => {
        const invoiced = workspace.financials.invoiced;
        const paid = workspace.financials.paid;
        const paymentStatus = derivePaymentStatus(invoiced, paid);
        const profitHealth = deriveProfitHealth(workspace.financials.profit, workspace.financials.selling);
        const hasVoucher = (workspace.invoices as any[]).some((inv: any) =>
          /voucher|فاوتش/i.test(inv.document_type || inv.invoice_type || ''),
        ) || Boolean((workspace.booking as any)?.voucher_number);
        const ctx: WorkflowContext = {
          stage: workspace.booking.workflow_stage,
          bookingId: id!,
          hasInvoice: (workspace.invoices ?? []).length > 0,
          hasVoucher,
          paymentStatus,
          hasCustomerPhone: Boolean(workspace.customer?.phone),
        };
        return (
          <>
            <WorkspaceExecutiveHeader
              workspace={workspace}
              paymentStatus={paymentStatus}
              profitHealth={profitHealth}
            />
            <StageStepper
              stage={workspace.booking.workflow_stage}
              onChange={(next) => workspace.setStage(next)}
            />
            <FinancialSummaryStrip bookingId={id!} />
            <SmartNextActionCard workspace={workspace} ctx={ctx} />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setTab('whatsapp')}>
                <MessageCircle className="h-4 w-4 ml-1" /> فتح واتساب
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/new?booking_id=${id}`)}>
                <FileText className="h-4 w-4 ml-1" /> إنشاء فاتورة
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTab('financials')}>
                <Wallet className="h-4 w-4 ml-1" /> تسجيل دفعة
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTab('documents')}>
                <Receipt className="h-4 w-4 ml-1" /> فاوتشر / مستندات
              </Button>
            </div>
          </>
        );
      })()}

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 md:grid-cols-8 h-auto">
          {TAB_KEYS.map((k) => (
            <TabsTrigger key={k} value={k} className="text-xs md:text-sm">
              {TAB_LABELS[k]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab workspace={workspace} onOpenTab={setTab} />
        </TabsContent>
        <TabsContent value="itinerary" className="mt-4">
          <ItineraryTab workspace={workspace} />
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
        <TabsContent value="timeline" className="mt-4">
          <TimelineTab workspace={workspace} />
        </TabsContent>
      </Tabs>
    </div>
  );
};


export default BookingWorkspace;
