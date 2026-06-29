import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const typeLabels: Record<string, string> = {
  hotel: 'فندق', flight: 'طيران', car_rental: 'سيارة', transport: 'نقل',
};

interface Props {
  customerId: string | null | undefined;
  currentBookingId: string;
}

export default function CustomerHistoryPanel({ customerId, currentBookingId }: Props) {
  const navigate = useNavigate();
  const { data: history } = useQuery({
    queryKey: ['customer-booking-history', customerId, currentBookingId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_number, booking_type, status, selling_price, currency, start_date')
        .eq('customer_id', customerId!)
        .neq('id', currentBookingId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  if (!customerId || !history || history.length === 0) return null;

  const totalSpend = history.reduce((s: number, b: any) => s + (b.selling_price || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <History className="h-4 w-4" />
            حجوزات سابقة لنفس العميل ({history.length})
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            إجمالي: {totalSpend.toLocaleString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map((b: any) => (
          <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{typeLabels[b.booking_type] || b.booking_type}</Badge>
              <span className="font-semibold">{b.booking_number}</span>
              <Badge variant="secondary" className="text-xs">{b.status}</Badge>
              {b.start_date && <span className="text-xs text-muted-foreground">{b.start_date}</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{b.selling_price?.toLocaleString()} {b.currency}</span>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/bookings/${b.id}`)}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
