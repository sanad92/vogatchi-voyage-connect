import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, Search, TrendingUp, AlertTriangle, Clock, CheckCircle2, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  useRecentDomainEvents,
  useEventDeliveries,
  useRetryDelivery,
  useReplayEvent,
  useEventBusStats,
  useEventVolumeHistory,
  type EventDelivery,
} from '@/hooks/useEventBus';

const statusVariant: Record<EventDelivery['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  succeeded: 'default',
  pending: 'secondary',
  failed: 'destructive',
  dead: 'destructive',
};

const StatCard = ({ icon: Icon, label, value, tone = 'default' }: {
  icon: any; label: string; value: string | number; tone?: 'default' | 'warn' | 'danger' | 'ok';
}) => {
  const toneClass = {
    default: 'text-primary',
    warn: 'text-amber-600',
    danger: 'text-destructive',
    ok: 'text-emerald-600',
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <Icon className={`h-6 w-6 ${toneClass}`} />
        </div>
      </CardContent>
    </Card>
  );
};

const DeliveriesTable = ({ status }: { status?: EventDelivery['status'] }) => {
  const { data = [], isLoading } = useEventDeliveries(status);
  const retry = useRetryDelivery();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">جارٍ التحميل...</div>;
  if (!data.length) return <div className="p-6 text-sm text-muted-foreground">لا توجد سجلات</div>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>الحالة</TableHead>
          <TableHead>Handler</TableHead>
          <TableHead>المحاولات</TableHead>
          <TableHead>زمن المعالجة</TableHead>
          <TableHead>آخر خطأ</TableHead>
          <TableHead>محدث في</TableHead>
          <TableHead className="text-right">إجراء</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => (
          <TableRow key={d.id}>
            <TableCell><Badge variant={statusVariant[d.status]}>{d.status}</Badge></TableCell>
            <TableCell className="font-mono text-xs">{d.handler_key}</TableCell>
            <TableCell>{d.attempts}</TableCell>
            <TableCell className="text-xs">{d.processing_ms != null ? `${d.processing_ms}ms` : '—'}</TableCell>
            <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground" title={d.last_error || ''}>
              {d.last_error || '—'}
            </TableCell>
            <TableCell className="text-xs">{new Date(d.updated_at).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <div className="flex gap-1 justify-end">
                <Link to={`/platform/event-bus/${d.event_id}`}>
                  <Button size="sm" variant="ghost">فتح</Button>
                </Link>
                {(d.status === 'failed' || d.status === 'dead') && (
                  <Button size="sm" variant="outline" onClick={() => retry.mutate(d.id)}>
                    <RefreshCw className="h-3 w-3 me-1" /> إعادة
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const EventsTable = ({ search, eventType, aggregateType }: {
  search: string; eventType: string; aggregateType: string;
}) => {
  const { data = [], isLoading } = useRecentDomainEvents({
    search: search || undefined,
    eventType: eventType || undefined,
    aggregateType: aggregateType || undefined,
    limit: 200,
  });
  const replay = useReplayEvent();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">جارٍ التحميل...</div>;
  if (!data.length) return <div className="p-6 text-sm text-muted-foreground">لا توجد أحداث</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>النوع</TableHead>
          <TableHead>Aggregate</TableHead>
          <TableHead>Aggregate ID</TableHead>
          <TableHead>Org</TableHead>
          <TableHead>مُثرى</TableHead>
          <TableHead>وقت الحدوث</TableHead>
          <TableHead className="text-right">إجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-mono text-xs">{e.event_type}</TableCell>
            <TableCell className="text-xs">{e.aggregate_type}</TableCell>
            <TableCell className="font-mono text-xs">{e.aggregate_id?.slice(0, 8) || '—'}</TableCell>
            <TableCell className="font-mono text-xs">{e.organization_id?.slice(0, 8) || '—'}</TableCell>
            <TableCell>
              {e.enriched_payload ? <Badge variant="outline" className="text-[10px]">✓</Badge> : <span className="text-xs text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="text-xs">{new Date(e.occurred_at).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              <div className="flex gap-1 justify-end">
                <Link to={`/platform/event-bus/${e.id}`}>
                  <Button size="sm" variant="ghost">استكشاف</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => replay.mutate(e.id)}>
                  <Play className="h-3 w-3 me-1" /> إعادة
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const VolumeChart = () => {
  const { data = [] } = useEventVolumeHistory(24);
  const chartData = useMemo(() => data.map(d => ({
    hour: new Date(d.hour).toLocaleTimeString([], { hour: '2-digit' }),
    count: d.count,
  })), [data]);
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const PlatformEventBus = () => {
  const [tab, setTab] = useState('events');
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('all');
  const [aggregateType, setAggregateType] = useState('all');
  const { data: stats } = useEventBusStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Event Bus
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          مراقبة تدفق الأحداث بين الوحدات، الطابور المباشر، Dead-letter، وإعادة التشغيل الآمن
        </p>
      </div>

      <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={TrendingUp} label="أحداث آخر 24س" value={stats?.events_24h ?? '—'} />
        <StatCard icon={Activity} label="إجمالي الأحداث" value={stats?.total_events ?? '—'} />
        <StatCard icon={Clock} label="قيد المعالجة" value={stats?.pending ?? '—'} tone="warn" />
        <StatCard icon={AlertTriangle} label="فاشلة" value={stats?.failed ?? '—'} tone="danger" />
        <StatCard icon={AlertTriangle} label="Dead-letter" value={stats?.dead ?? '—'} tone="danger" />
        <StatCard icon={CheckCircle2} label="ناجحة 24س" value={stats?.succeeded_24h ?? '—'} tone="ok" />
        <StatCard icon={Clock} label="متوسط زمن" value={stats ? `${stats.avg_processing_ms}ms` : '—'} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">حجم الأحداث (آخر 24 ساعة)</CardTitle></CardHeader>
        <CardContent><VolumeChart /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">النشاط</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-wrap items-center gap-2 mx-4 mt-4">
              <TabsList>
                <TabsTrigger value="events">الأحداث</TabsTrigger>
                <TabsTrigger value="pending">قيد المعالجة</TabsTrigger>
                <TabsTrigger value="failed">فاشلة</TabsTrigger>
                <TabsTrigger value="dead">Dead-letter</TabsTrigger>
                <TabsTrigger value="succeeded">ناجحة</TabsTrigger>
              </TabsList>

              {tab === 'events' && (
                <div className="flex flex-wrap gap-2 ms-auto">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالنوع أو Aggregate..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pr-8 h-8 w-56"
                    />
                  </div>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="h-8 w-44"><SelectValue placeholder="النوع" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      <SelectItem value="booking.created">booking.created</SelectItem>
                      <SelectItem value="booking.stage_changed">booking.stage_changed</SelectItem>
                      <SelectItem value="booking.completed">booking.completed</SelectItem>
                      <SelectItem value="quote.accepted">quote.accepted</SelectItem>
                      <SelectItem value="invoice.paid">invoice.paid</SelectItem>
                      <SelectItem value="customer.payment.recorded">customer.payment.recorded</SelectItem>
                      <SelectItem value="supplier.payment.recorded">supplier.payment.recorded</SelectItem>
                      <SelectItem value="voucher.generated">voucher.generated</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={aggregateType} onValueChange={setAggregateType}>
                    <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Aggregate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأنواع</SelectItem>
                      <SelectItem value="booking">booking</SelectItem>
                      <SelectItem value="quote">quote</SelectItem>
                      <SelectItem value="invoice">invoice</SelectItem>
                      <SelectItem value="customer_payment">customer_payment</SelectItem>
                      <SelectItem value="supplier_payment">supplier_payment</SelectItem>
                      <SelectItem value="voucher">voucher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <TabsContent value="events" className="p-0">
              <EventsTable
                search={search}
                eventType={eventType === 'all' ? '' : eventType}
                aggregateType={aggregateType === 'all' ? '' : aggregateType}
              />
            </TabsContent>
            <TabsContent value="pending" className="p-0"><DeliveriesTable status="pending" /></TabsContent>
            <TabsContent value="failed" className="p-0"><DeliveriesTable status="failed" /></TabsContent>
            <TabsContent value="dead" className="p-0"><DeliveriesTable status="dead" /></TabsContent>
            <TabsContent value="succeeded" className="p-0"><DeliveriesTable status="succeeded" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformEventBus;
