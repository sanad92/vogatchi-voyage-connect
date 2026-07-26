import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, MessageCircle, Clock } from 'lucide-react';
import { useOpsQueue, type QueueFilter } from '@/hooks/useOpsCommandCenter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: 'today',            label: 'اليوم' },
  { key: 'overdue',          label: 'متأخرة' },
  { key: 'assigned_to_me',   label: 'مخصص لي' },
  { key: 'waiting_customer', label: 'بانتظار العميل' },
  { key: 'waiting_supplier', label: 'بانتظار المورد' },
  { key: 'waiting_payment',  label: 'بانتظار الدفع' },
  { key: 'completed_today',  label: 'مكتمل اليوم' },
];

const QueueList = ({ filter }: { filter: QueueFilter }) => {
  const { data, isLoading } = useOpsQueue(filter);
  const qc = useQueryClient();

  const markDone = async (id: string) => {
    const { error } = await (supabase as any)
      .from('booking_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('تم إنجاز المهمة');
    qc.invalidateQueries({ queryKey: ['ops-queue'] });
    qc.invalidateQueries({ queryKey: ['ops-command-center'] });
  };

  if (isLoading) return <p className="text-muted-foreground py-8 text-center">جاري التحميل…</p>;
  if (!data || data.length === 0)
    return <p className="text-muted-foreground py-8 text-center">لا توجد مهام في هذا القسم.</p>;

  return (
    <div className="space-y-2">
      {data.map((t: any) => (
        <Card key={t.id}>
          <CardContent className="pt-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{t.title}</p>
                <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                {t.booking?.booking_number && (
                  <Badge variant="secondary" className="text-[10px]">{t.booking.booking_number}</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <Clock className="h-3 w-3" />
                {t.due_at ? formatDistanceToNow(new Date(t.due_at), { addSuffix: true, locale: ar }) : '—'}
                {t.booking?.customer_name && <span>· {t.booking.customer_name}</span>}
              </div>
            </div>
            <div className="flex gap-1.5">
              {t.booking?.id && (
                <Link to={`/bookings/${t.booking.id}/workspace`}>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-3.5 w-3.5 ml-1" /> الحجز
                  </Button>
                </Link>
              )}
              {t.booking?.customer_id && (
                <Link to={`/whatsapp-inbox?customer=${t.booking.customer_id}`}>
                  <Button size="sm" variant="outline">
                    <MessageCircle className="h-3.5 w-3.5 ml-1" /> واتساب
                  </Button>
                </Link>
              )}
              {t.status !== 'completed' && (
                <Button size="sm" onClick={() => markDone(t.id)}>
                  <CheckCircle2 className="h-3.5 w-3.5 ml-1" /> إنجاز
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const OperationsQueue = () => {
  const [active, setActive] = useState<QueueFilter>('today');
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">قائمة العمليات اليومية</h1>
        <p className="text-sm text-muted-foreground">كل المهام في مكان واحد — بإجراء بنقرة واحدة</p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">التصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={active} onValueChange={(v) => setActive(v as QueueFilter)}>
            <TabsList className="flex-wrap h-auto">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.key} value={f.key} className="text-xs">{f.label}</TabsTrigger>
              ))}
            </TabsList>
            {FILTERS.map((f) => (
              <TabsContent key={f.key} value={f.key} className="mt-4">
                <QueueList filter={f.key} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsQueue;
