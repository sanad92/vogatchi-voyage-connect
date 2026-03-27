import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useQuotes, type Quote, type QuoteItem } from '@/hooks/useQuotes';
import { useQuoteConversion } from '@/hooks/useQuoteConversion';
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge';
import ConvertQuoteDialog from '@/components/quotes/ConvertQuoteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Send, CheckCircle, XCircle, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const itemTypeLabels: Record<string, string> = {
  hotel: 'فندق',
  flight: 'طيران',
  transport: 'نقل',
  car_rental: 'تأجير سيارة',
  service: 'خدمة',
};

export default function QuoteDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { updateQuoteStatus } = useQuotes();
  const { convertToBooking } = useQuoteConversion();
  const [convertOpen, setConvertOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['quote', id, orgId],
    queryFn: async () => {
      const [quoteRes, itemsRes] = await Promise.all([
        supabase.from('quotes').select('*, customers(name, phone, email), employees(full_name)').eq('id', id!).single(),
        supabase.from('quote_items').select('*').eq('quote_id', id!).order('sort_order'),
      ]);
      if (quoteRes.error) throw quoteRes.error;
      return { quote: quoteRes.data as Quote, items: (itemsRes.data ?? []) as QuoteItem[] };
    },
    enabled: !!id && !!orgId,
  });

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">عرض السعر غير موجود</div>;

  const { quote, items } = data;
  const canConvert = quote.status === 'sent' || quote.status === 'draft';

  const handleConvert = async () => {
    await convertToBooking.mutateAsync({ quote, items });
    setConvertOpen(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{quote.quote_number}</h1>
            <QuoteStatusBadge status={quote.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quote.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => updateQuoteStatus.mutate({ id: quote.id, status: 'sent' })}>
              <Send className="h-4 w-4 ml-1" />
              إرسال
            </Button>
          )}
          {canConvert && (
            <>
              <Button variant="outline" size="sm" className="text-green-600" onClick={() => updateQuoteStatus.mutate({ id: quote.id, status: 'accepted' })}>
                <CheckCircle className="h-4 w-4 ml-1" />
                قبول
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => updateQuoteStatus.mutate({ id: quote.id, status: 'rejected' })}>
                <XCircle className="h-4 w-4 ml-1" />
                رفض
              </Button>
            </>
          )}
          {canConvert && items.length > 0 && (
            <Button size="sm" onClick={() => setConvertOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 ml-1" />
              تحويل لحجز + فاتورة
            </Button>
          )}
        </div>
      </div>

      {/* Quote Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">بيانات العميل</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">الاسم</span><span>{quote.customer_name || quote.customers?.name}</span></div>
            {quote.customers?.phone && <div className="flex justify-between"><span className="text-muted-foreground">الهاتف</span><span dir="ltr">{quote.customers.phone}</span></div>}
            {quote.customers?.email && <div className="flex justify-between"><span className="text-muted-foreground">البريد</span><span>{quote.customers.email}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">تفاصيل الرحلة</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">الوجهة</span><span>{quote.destination || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">تاريخ السفر</span><span>{quote.travel_date ? format(new Date(quote.travel_date), 'dd MMM yyyy', { locale: ar }) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">تاريخ العودة</span><span>{quote.return_date ? format(new Date(quote.return_date), 'dd MMM yyyy', { locale: ar }) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">عدد المسافرين</span><span>{quote.number_of_travelers}</span></div>
            {quote.employees?.full_name && <div className="flex justify-between"><span className="text-muted-foreground">الموظف</span><span>{quote.employees.full_name}</span></div>}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">عناصر العرض ({items.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>سعر التكلفة</TableHead>
                  <TableHead>سعر البيع</TableHead>
                  <TableHead>إجمالي التكلفة</TableHead>
                  <TableHead>إجمالي البيع</TableHead>
                  <TableHead>الربح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{itemTypeLabels[item.item_type] || item.item_type}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.cost_price?.toLocaleString()}</TableCell>
                    <TableCell>{item.selling_price?.toLocaleString()}</TableCell>
                    <TableCell>{item.total_cost?.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">{item.total_selling?.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600 font-semibold">{((item.total_selling || 0) - (item.total_cost || 0)).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">الملخص المالي</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-muted-foreground">الإجمالي الفرعي</div>
              <div className="text-lg font-bold">{quote.subtotal?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-muted-foreground">الخصم</div>
              <div className="text-lg font-bold text-destructive">{quote.discount_amount?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-muted-foreground">الضريبة ({quote.vat_rate}%)</div>
              <div className="text-lg font-bold">{quote.vat_amount?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <div className="text-muted-foreground">الإجمالي</div>
              <div className="text-lg font-bold text-primary">{quote.total_amount?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="text-muted-foreground">إجمالي التكلفة</div>
              <div className="text-lg font-bold text-destructive">{quote.total_cost?.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="text-muted-foreground">الربح</div>
              <div className="text-lg font-bold text-green-600">{quote.total_profit?.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">ملاحظات</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{quote.notes}</p></CardContent>
        </Card>
      )}

      <ConvertQuoteDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        onConfirm={handleConvert}
        isLoading={convertToBooking.isPending}
        itemCount={items.length}
      />
    </div>
  );
}
