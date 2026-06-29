import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import { useDataQuality, useIncompleteBookings, IncompleteBooking } from '@/hooks/useDataQuality';

type IssueFilter = 'all' | 'dates' | 'prices' | 'supplier' | 'customer';

const issueLabel = (b: IncompleteBooking) => {
  const issues: string[] = [];
  if (!b.start_date || !b.end_date) issues.push('تواريخ');
  if (!b.selling_price || !b.cost_price) issues.push('أسعار');
  if (!b.supplier_id) issues.push('مورد');
  if (!b.customer_id) issues.push('عميل');
  return issues;
};

const DataQualityPage: React.FC = () => {
  const { data: counts } = useDataQuality();
  const { data: bookings = [], isLoading } = useIncompleteBookings();
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filter === 'dates' && b.start_date && b.end_date) return false;
      if (filter === 'prices' && b.selling_price && b.cost_price) return false;
      if (filter === 'supplier' && b.supplier_id) return false;
      if (filter === 'customer' && b.customer_id) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          (b.booking_number || '').toLowerCase().includes(s) ||
          (b.customer_name || '').toLowerCase().includes(s) ||
          (b.supplier_name || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [bookings, filter, q]);

  const total = counts
    ? counts.bookings_missing_dates +
      counts.bookings_missing_prices +
      counts.bookings_missing_supplier +
      counts.bookings_no_customer
    : 0;

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6" dir="rtl">
      <BreadcrumbNav items={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'جودة البيانات' }]} />

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> جودة البيانات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            راجع وأكمل السجلات الناقصة لضمان دقة التقارير المحاسبية والمالية.
          </p>
        </div>
        {total === 0 && (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> كل البيانات مكتملة
          </Badge>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { l: 'تواريخ ناقصة', v: counts?.bookings_missing_dates ?? 0 },
          { l: 'أسعار ناقصة', v: counts?.bookings_missing_prices ?? 0 },
          { l: 'موردين ناقصين', v: counts?.bookings_missing_supplier ?? 0 },
          { l: 'بدون عميل', v: counts?.bookings_no_customer ?? 0 },
          { l: 'عملاء بدون إيميل', v: counts?.customers_no_email ?? 0 },
          { l: 'عملاء بدون هاتف', v: counts?.customers_no_phone ?? 0 },
        ].map((c) => (
          <Card key={c.l} className="p-3">
            <div className="text-xs text-muted-foreground">{c.l}</div>
            <div className="text-2xl font-bold mt-1">{c.v}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as IssueFilter)}>
            <TabsList>
              <TabsTrigger value="all">الكل</TabsTrigger>
              <TabsTrigger value="dates">تواريخ</TabsTrigger>
              <TabsTrigger value="prices">أسعار</TabsTrigger>
              <TabsTrigger value="supplier">موردين</TabsTrigger>
              <TabsTrigger value="customer">عملاء</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث برقم الحجز / العميل / المورد..."
            className="max-w-sm"
          />
        </div>

        <div>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>سعر البيع</TableHead>
                  <TableHead>التكلفة</TableHead>
                  <TableHead>النواقص</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">جارٍ التحميل...</TableCell></TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
                )}
                {filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.booking_number || '—'}</TableCell>
                    <TableCell>{b.service_type || '—'}</TableCell>
                    <TableCell>{b.customer_name || <span className="text-destructive">—</span>}</TableCell>
                    <TableCell>{b.supplier_name || <span className="text-destructive">—</span>}</TableCell>
                    <TableCell className="text-xs">
                      {b.start_date ? `${b.start_date}${b.end_date ? ' → ' + b.end_date : ''}` : <span className="text-destructive">—</span>}
                    </TableCell>
                    <TableCell>{b.selling_price ? `${b.selling_price} ${b.currency || ''}` : <span className="text-destructive">—</span>}</TableCell>
                    <TableCell>{b.cost_price ? `${b.cost_price} ${b.currency || ''}` : <span className="text-destructive">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {issueLabel(b).map((i) => (
                          <Badge key={i} variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">{i}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/bookings/${b.id}`}>
                          فتح <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Card>
    </div>
  );
};

export default DataQualityPage;
