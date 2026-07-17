import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, RefreshCw, MessageCircle, FileText, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useBookingWorkspace } from '@/hooks/useBookingWorkspace';
import { WorkspaceHeader } from '@/components/bookings/workspace/WorkspaceHeader';
import { StageStepper } from '@/components/bookings/workspace/StageStepper';
import { OverviewTab } from '@/components/bookings/workspace/OverviewTab';
import { ItineraryTab } from '@/components/bookings/workspace/ItineraryTab';
import { FinancialsTab } from '@/components/bookings/workspace/FinancialsTab';
import { DocumentsTab } from '@/components/bookings/workspace/DocumentsTab';
import { WhatsAppTab } from '@/components/bookings/workspace/WhatsAppTab';
import { TasksTab } from '@/components/bookings/workspace/TasksTab';
import { TimelineTab } from '@/components/bookings/workspace/TimelineTab';

const TAB_KEYS = ['overview', 'itinerary', 'financials', 'documents', 'whatsapp', 'tasks', 'timeline'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'نظرة عامة',
  itinerary: 'البرنامج',
  financials: 'المالية',
  documents: 'المستندات',
  whatsapp: 'واتساب',
  tasks: 'المهام والملاحظات',
  timeline: 'السجل الزمني',
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

      <WorkspaceHeader workspace={workspace} onOpenTab={setTab} />

      <StageStepper
        stage={workspace.booking.workflow_stage}
        onChange={(next) => workspace.setStage(next)}
      />

      {/* Summary */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <SummaryStat label="العميل" value={workspace.customer?.name || workspace.booking.customer_name || '—'} />
            <SummaryStat label="المورد" value={workspace.supplier?.name || workspace.booking.supplier_name || '—'} />
            <SummaryStat
              label="التواريخ"
              value={
                workspace.booking.start_date
                  ? `${workspace.booking.start_date}${workspace.booking.end_date ? ' → ' + workspace.booking.end_date : ''}`
                  : '—'
              }
            />
            <SummaryStat
              label="سعر البيع"
              value={`${Number(workspace.financials.selling).toLocaleString()} ${workspace.financials.currency}`}
            />
            <SummaryStat
              label="الربح"
              value={`${Number(workspace.financials.profit).toLocaleString()} ${workspace.financials.currency}`}
              tone={workspace.financials.profit >= 0 ? 'positive' : 'negative'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick actions bar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setTab('whatsapp')}>
          <MessageCircle className="h-4 w-4 ml-1" /> فتح واتساب
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate(`/documents?booking_id=${id}`)}>
          <FileText className="h-4 w-4 ml-1" /> إنشاء فاتورة
        </Button>
        <Button size="sm" variant="outline" onClick={() => setTab('financials')}>
          <Wallet className="h-4 w-4 ml-1" /> تسجيل دفعة
        </Button>
        <Button size="sm" variant="outline" onClick={() => setTab('documents')}>
          <Receipt className="h-4 w-4 ml-1" /> فاوتشر / مستندات
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 md:grid-cols-7 h-auto">
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

const SummaryStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'positive' | 'negative';
}) => (
  <div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p
      className={`font-semibold truncate ${
        tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-destructive' : ''
      }`}
    >
      {value}
    </p>
  </div>
);

export default BookingWorkspace;
