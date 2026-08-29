import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarClock, HandCoins, Pencil, Plus, Search, Target, TrendingUp,
  TriangleAlert, Trophy, UserRoundCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LeadIntakeForm from '@/components/sop/LeadIntakeForm';
import MySopStatusBar from '@/components/sop/MySopStatusBar';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import {
  useClaimLead,
  useMyDepartments,
  useReopenLead,
  useSopLeads,
  useSopRealtime,
  type SopLead,
} from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import {
  buildLeadPipelineStats,
  CLOSED_LEAD_STAGES,
  formatLeadDateTime,
  isFollowUpOverdue,
  LEAD_SOURCE_LABELS,
  OPEN_LEAD_STAGES,
} from '@/lib/leadPipeline';
import { LEAD_STAGE_LABELS, type SopLeadStage } from '@/lib/sop';

type WorkspaceView = 'inbox' | 'pipeline' | 'followups' | 'closed';
type FollowUpFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none';

const ALL_WORKSPACE_STAGES: SopLeadStage[] = [...OPEN_LEAD_STAGES, ...CLOSED_LEAD_STAGES];
const PIPELINE_COLUMNS = OPEN_LEAD_STAGES.filter((stage) => stage !== 'new');

const validView = (value: string | null): WorkspaceView =>
  value === 'pipeline' || value === 'followups' || value === 'closed' ? value : 'inbox';

interface LeadCardProps {
  lead: SopLead;
  ownerName?: string;
  canEdit: boolean;
  canClaim: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onClaim: () => void;
  claimPending: boolean;
}

const LeadCard = ({
  lead, ownerName, canEdit, canClaim, onOpen, onEdit, onClaim, claimPending,
}: LeadCardProps) => {
  const overdue = isFollowUpOverdue(lead);

  return (
    <Card className="cursor-pointer transition hover:border-primary/50 hover:shadow-sm" onClick={onOpen}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{lead.contact_name || 'اسم غير مكتمل'}</div>
            <div className="text-[11px] text-muted-foreground" dir="ltr">
              {lead.lead_number || 'بانتظار رقم الطلب'}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {LEAD_STAGE_LABELS[lead.stage]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          <span className="text-muted-foreground">{lead.destination || lead.city || 'الوجهة غير محددة'}</span>
          {lead.lead_source && (
            <Badge variant="outline" className="text-[10px]">
              {LEAD_SOURCE_LABELS[lead.lead_source] || lead.lead_source}
            </Badge>
          )}
          {lead.customer_id && <Badge variant="outline" className="text-[10px]">مرتبط بعميل</Badge>}
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">المسؤول: {ownerName || 'بانتظار التوزيع'}</span>
          {lead.next_follow_up_at && (
            <Badge variant={overdue ? 'destructive' : 'outline'} className="text-[10px] shrink-0">
              {overdue ? 'متابعة متأخرة' : formatLeadDateTime(lead.next_follow_up_at)}
            </Badge>
          )}
        </div>

        {(canEdit || (canClaim && !lead.current_owner_id && lead.stage === 'new')) && (
          <div className="flex gap-1 border-t pt-2" onClick={(event) => event.stopPropagation()}>
            {canClaim && !lead.current_owner_id && lead.stage === 'new' && (
              <Button size="sm" className="h-7 text-xs" disabled={claimPending} onClick={onClaim}>
                <HandCoins className="h-3.5 w-3.5 ml-1" /> استلام
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 ml-1" /> تعديل البيانات
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MetricCard = ({
  label, value, hint, icon, active, onClick,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) => (
  <Card
    role="button"
    tabIndex={0}
    className={`cursor-pointer transition hover:border-primary/50 ${active ? 'border-primary bg-primary/5' : ''}`}
    onClick={onClick}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onClick(); }}
  >
    <CardContent className="p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      </div>
      <div className="rounded-lg bg-muted p-2 text-primary">{icon}</div>
    </CardContent>
  </Card>
);

const SopPipeline = () => {
  usePageTitle('العملاء المحتملون ومسار المبيعات');
  useSopRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const { members } = useOrgMembers();
  const { has, isManager } = useMyDepartments();
  const { canCreateCRM, canEditCRM } = useSupabasePermissions();
  const claim = useClaimLead();
  const reopen = useReopenLead();

  const [view, setViewState] = useState<WorkspaceView>(() => validView(searchParams.get('view')));
  const [search, setSearch] = useState('');
  const [owner, setOwner] = useState('all');
  const [source, setSource] = useState('all');
  const [followUp, setFollowUp] = useState<FollowUpFilter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<SopLead | null>(null);
  const [creating, setCreating] = useState(false);

  const setView = (next: WorkspaceView) => {
    setViewState(next);
    setSearchParams({ view: next }, { replace: true });
  };

  const { data: leads = [], isLoading, isError, error } = useSopLeads({
    stages: ALL_WORKSPACE_STAGES,
    ownerId: owner === 'all' ? undefined : owner,
    source: source === 'all' ? undefined : source,
    followUp: followUp === 'all' ? undefined : followUp,
    search: search || undefined,
    sortBy: view === 'followups' ? 'follow_up' : 'updated_at',
  });

  const stats = useMemo(() => buildLeadPipelineStats(leads), [leads]);
  const inbox = leads.filter((lead) => lead.stage === 'new');
  const active = leads.filter((lead) => OPEN_LEAD_STAGES.includes(lead.stage) && lead.stage !== 'new');
  const followups = leads
    .filter((lead) => OPEN_LEAD_STAGES.includes(lead.stage) && !!lead.next_follow_up_at)
    .sort((a, b) => new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime());
  const closed = leads.filter((lead) => CLOSED_LEAD_STAGES.includes(lead.stage));
  const canClaim = has('sales');
  const canReopen = isManager || has('customer_service');

  const ownerName = (lead: SopLead) => members.find((member) => member.user_id === lead.current_owner_id)?.profile?.full_name
    || (lead.current_owner_id ? lead.current_owner_id.slice(0, 8) : undefined);

  const renderCards = (rows: SopLead[], emptyText: string, showReopen = false) => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((lead) => (
        <div key={lead.id} className="space-y-1">
          <LeadCard
            lead={lead}
            ownerName={ownerName(lead)}
            canEdit={canEditCRM()}
            canClaim={canClaim}
            onOpen={() => setSelected(lead.id)}
            onEdit={() => setEditing(lead)}
            onClaim={() => { setSelected(lead.id); claim.mutate(lead.id); }}
            claimPending={claim.isPending}
          />
          {showReopen && canReopen && (lead.stage === 'lost' || lead.stage === 'cancelled') && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={reopen.isPending}
              onClick={() => reopen.mutate(lead.id)}
            >
              إعادة فتح الملف
            </Button>
          )}
        </div>
      ))}
      {!rows.length && !isLoading && (
        <Card className="sm:col-span-2 xl:col-span-3 border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">{emptyText}</CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="p-3 sm:p-6 space-y-5" dir="rtl">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">العملاء المحتملون ومسار المبيعات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            شاشة واحدة من استقبال الطلب، مرورًا بالتوزيع والمتابعة، وحتى التحويل إلى عميل وتسليمه للتسعير.
          </p>
        </div>
        {canCreateCRM() && (
          <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 ml-2" /> عميل محتمل جديد
          </Button>
        )}
      </header>

      <MySopStatusBar department="sales" />

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
        <MetricCard label="وارد جديد" value={stats.newLeads} hint="بانتظار الاستلام" icon={<UserRoundCheck className="h-5 w-5" />} active={view === 'inbox'} onClick={() => setView('inbox')} />
        <MetricCard label="قيد البيع" value={stats.active} hint="ملفات مفتوحة" icon={<TrendingUp className="h-5 w-5" />} active={view === 'pipeline'} onClick={() => setView('pipeline')} />
        <MetricCard label="متابعات متأخرة" value={stats.overdue} hint="تحتاج إجراء اليوم" icon={<TriangleAlert className="h-5 w-5" />} active={view === 'followups'} onClick={() => { setFollowUp('overdue'); setView('followups'); }} />
        <MetricCard label="تم التسعير" value={stats.quoted} hint="عرض أو تفاوض" icon={<Target className="h-5 w-5" />} onClick={() => setView('pipeline')} />
        <MetricCard label="معدل التحويل" value={`${stats.conversionRate}%`} hint={`${stats.won} مكتسب من ${stats.won + stats.lost} محسوم`} icon={<Trophy className="h-5 w-5" />} active={view === 'closed'} onClick={() => setView('closed')} />
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالاسم أو الهاتف أو البريد أو رقم الطلب أو الوجهة" className="pr-9" />
            </div>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger><SelectValue placeholder="المسؤول" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المسؤولين</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>{member.profile?.full_name || member.profile?.email || member.user_id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder="المصدر" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المصادر</SelectItem>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={followUp} onValueChange={(value) => setFollowUp(value as FollowUpFilter)}>
              <SelectTrigger><CalendarClock className="h-4 w-4 ml-2" /><SelectValue placeholder="المتابعة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المتابعات</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="upcoming">قادمة</SelectItem>
                <SelectItem value="none">بدون متابعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">المؤشرات والقوائم تتحدث حسب الفلاتر الحالية.</p>
        </CardContent>
      </Card>

      <Tabs value={view} onValueChange={(value) => setView(value as WorkspaceView)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="inbox">الوارد ({inbox.length})</TabsTrigger>
          <TabsTrigger value="pipeline">مسار البيع ({active.length})</TabsTrigger>
          <TabsTrigger value="followups">المتابعات ({followups.length})</TabsTrigger>
          <TabsTrigger value="closed">المغلق ({closed.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isError && (
        <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">تعذر تحميل العملاء المحتملين: {error instanceof Error ? error.message : 'خطأ غير معروف'}</CardContent></Card>
      )}
      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-lg bg-muted" />)}</div>
      )}
      {!isLoading && !isError && view === 'inbox' && renderCards(inbox, 'لا توجد طلبات جديدة بانتظار الاستلام.')}
      {!isLoading && !isError && view === 'followups' && renderCards(followups, 'لا توجد متابعات مطابقة للفلاتر الحالية.')}
      {!isLoading && !isError && view === 'closed' && renderCards(closed, 'لا توجد ملفات مغلقة مطابقة للفلاتر.', true)}

      {!isLoading && !isError && view === 'pipeline' && (
        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-max gap-3">
            {PIPELINE_COLUMNS.map((stage) => {
              const stageLeads = active.filter((lead) => lead.stage === stage);
              return (
                <section key={stage} className="w-72 shrink-0 space-y-2">
                  <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <span className="text-xs font-medium">{LEAD_STAGE_LABELS[stage]}</span>
                    <Badge variant="outline">{stageLeads.length}</Badge>
                  </div>
                  {stageLeads.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} ownerName={ownerName(lead)} canEdit={canEditCRM()} canClaim={canClaim} onOpen={() => setSelected(lead.id)} onEdit={() => setEditing(lead)} onClaim={() => claim.mutate(lead.id)} claimPending={claim.isPending} />
                  ))}
                  {!stageLeads.length && <div className="rounded-md border border-dashed p-5 text-center text-xs text-muted-foreground">لا يوجد</div>}
                </section>
              );
            })}
          </div>
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-2xl" dir="rtl">
          <SheetHeader className="text-right mb-4">
            <SheetTitle>ملف العميل المحتمل</SheetTitle>
            <SheetDescription>البيانات، المرحلة، الصلاحيات، المتابعات والتسعير في سجل واحد.</SheetDescription>
          </SheetHeader>
          {selected && <SopLeadPanel leadId={selected} />}
        </SheetContent>
      </Sheet>

      <Dialog open={creating || !!editing} onOpenChange={(open) => { if (!open) { setCreating(false); setEditing(null); } }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? 'تعديل بيانات العميل المحتمل' : 'عميل محتمل جديد'}</DialogTitle></DialogHeader>
          <LeadIntakeForm lead={editing} onSaved={(lead) => { setCreating(false); setEditing(null); setSelected(lead.id); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SopPipeline;
