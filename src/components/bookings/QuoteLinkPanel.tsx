import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props { quoteId: string | null | undefined; }

export default function QuoteLinkPanel({ quoteId }: Props) {
  const navigate = useNavigate();
  const { data: quote } = useQuery({
    queryKey: ['booking-quote-link', quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data } = await supabase
        .from('quotes')
        .select('id, quote_number, status, total_amount, currency, travel_date')
        .eq('id', quoteId!)
        .maybeSingle();
      return data;
    },
  });

  if (!quoteId || !quote) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          تم تحويله من عرض سعر
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="space-y-1">
          <div className="font-semibold">{quote.quote_number}</div>
          <div className="text-muted-foreground">
            {quote.total_amount?.toLocaleString()} {quote.currency} · حالة: {quote.status}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/quotes/${quote.id}`)}>
          <ExternalLink className="h-4 w-4 ml-1" />
          فتح عرض السعر
        </Button>
      </CardContent>
    </Card>
  );
}
