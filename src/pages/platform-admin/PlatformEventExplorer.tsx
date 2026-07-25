import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, RefreshCw, Play, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useDomainEvent,
  useDeliveriesForEvent,
  useRetryDelivery,
  useReplayEvent,
  type EventDelivery,
} from '@/hooks/useEventBus';

const statusVariant: Record<EventDelivery['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  succeeded: 'default',
  pending: 'secondary',
  failed: 'destructive',
  dead: 'destructive',
};

const JsonBlock = ({ data }: { data: unknown }) => (
  <pre className="text-[11px] bg-muted/40 border rounded-md p-3 overflow-auto max-h-96 leading-relaxed" dir="ltr">
    {JSON.stringify(data ?? null, null, 2)}
  </pre>
);

const PlatformEventExplorer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useDomainEvent(id);
  const { data: deliveries = [] } = useDeliveriesForEvent(id);
  const retry = useRetryDelivery();
  const replay = useReplayEvent();

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">جارٍ التحميل...</div>;
  if (!event) return <div className="p-6 text-sm text-muted-foreground">الحدث غير موجود</div>;

  const bookingId = (event.enriched_payload as any)?.booking?.id
    || (event.payload as any)?.booking_id
    || (event.aggregate_type === 'booking' ? event.aggregate_id : null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/platform/event-bus')}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono">{event.event_type}</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">{event.id}</p>
          </div>
        </div>
        <Button
          onClick={() => id && replay.mutate(id)}
          disabled={replay.isPending}
          size="sm"
        >
          <Play className="h-3.5 w-3.5 me-1" /> إعادة تشغيل الحدث
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Aggregate</div>
          <div className="text-sm font-medium mt-1">{event.aggregate_type}</div>
          <div className="text-[10px] font-mono text-muted-foreground mt-1">{event.aggregate_id?.slice(0, 8) || '—'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Organization</div>
          <div className="text-sm font-mono mt-1">{event.organization_id?.slice(0, 8) || '—'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">وقت الحدوث</div>
          <div className="text-sm mt-1">{new Date(event.occurred_at).toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">التسليمات</div>
          <div className="text-2xl font-bold mt-1">{deliveries.length}</div>
        </CardContent></Card>
      </div>

      {bookingId && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="text-sm">حجز مرتبط</div>
            <Link to={`/bookings/${bookingId}/workspace`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 me-1" /> فتح مساحة عمل الحجز
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Payload الأصلي</CardTitle></CardHeader>
          <CardContent><JsonBlock data={event.payload} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Payload المُثرى (Enriched)</CardTitle></CardHeader>
          <CardContent><JsonBlock data={event.enriched_payload} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">سجل التسليم للمشتركين</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Handler</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>المحاولات</TableHead>
                <TableHead>زمن المعالجة</TableHead>
                <TableHead>آخر خطأ</TableHead>
                <TableHead>محدث في</TableHead>
                <TableHead className="text-right">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.handler_key}</TableCell>
                  <TableCell><Badge variant={statusVariant[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell>{d.attempts}</TableCell>
                  <TableCell className="text-xs">{d.processing_ms != null ? `${d.processing_ms}ms` : '—'}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground" title={d.last_error || ''}>
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
              {!deliveries.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">لا توجد تسليمات</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformEventExplorer;
