import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const typeLabels: Record<string, string> = {
  hotel: 'فندق', flight: 'طيران', car_rental: 'سيارة', transport: 'نقل',
};

export default function QuoteBookingsPanel({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate();
  const { data: bookings } = useQuery({
    queryKey: ['quote-bookings', quoteId],
    queryFn: async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_number, booking_type, status, selling_price, currency')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  if (!bookings || bookings.length === 0) return null;

  return (
    <Card className="border-green-300 bg-green-50/40 dark:bg-green-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          الحجوزات الناتجة ({bookings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {bookings.map((b: any) => (
          <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border bg-background p-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{typeLabels[b.booking_type] || b.booking_type}</Badge>
              <span className="font-semibold">{b.booking_number}</span>
              <Badge variant="secondary" className="text-xs">{b.status}</Badge>
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
