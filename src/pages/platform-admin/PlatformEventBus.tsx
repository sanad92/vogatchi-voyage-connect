import { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useRecentDomainEvents,
  useEventDeliveries,
  useRetryDelivery,
  type EventDelivery,
} from '@/hooks/useEventBus';

const statusVariant: Record<EventDelivery['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  succeeded: 'default',
  pending: 'secondary',
  failed: 'destructive',
  dead: 'destructive',
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
            <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground" title={d.last_error || ''}>
              {d.last_error || '—'}
            </TableCell>
            <TableCell className="text-xs">{new Date(d.updated_at).toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {(d.status === 'failed' || d.status === 'dead') && (
                <Button size="sm" variant="outline" onClick={() => retry.mutate(d.id)}>
                  <RefreshCw className="h-3 w-3 me-1" /> إعادة
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const EventsTable = () => {
  const { data = [], isLoading } = useRecentDomainEvents(100);
  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">جارٍ التحميل...</div>;
  if (!data.length) return <div className="p-6 text-sm text-muted-foreground">لا توجد أحداث بعد</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>النوع</TableHead>
          <TableHead>Aggregate</TableHead>
          <TableHead>Aggregate ID</TableHead>
          <TableHead>وقت الحدوث</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-mono text-xs">{e.event_type}</TableCell>
            <TableCell className="text-xs">{e.aggregate_type}</TableCell>
            <TableCell className="font-mono text-xs">{e.aggregate_id?.slice(0, 8) || '—'}</TableCell>
            <TableCell className="text-xs">{new Date(e.occurred_at).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const PlatformEventBus = () => {
  const [tab, setTab] = useState('events');
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Event Bus
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          مراقبة تدفق الأحداث بين الوحدات وإدارة إعادة المحاولات
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">النشاط</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="events">الأحداث</TabsTrigger>
              <TabsTrigger value="pending">قيد المعالجة</TabsTrigger>
              <TabsTrigger value="failed">فاشلة</TabsTrigger>
              <TabsTrigger value="dead">Dead-letter</TabsTrigger>
              <TabsTrigger value="succeeded">ناجحة</TabsTrigger>
            </TabsList>
            <TabsContent value="events" className="p-0"><EventsTable /></TabsContent>
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
