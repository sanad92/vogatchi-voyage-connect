import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { sanitizeSearchTerm } from '@/lib/postgrest-safe';
import { ListLoadError } from '@/components/common/ListLoadError';
import { Link, useNavigate } from 'react-router-dom';
import { bookingStatusLabel } from '@/lib/bookingStatus';
import { customerDisplayName } from '@/lib/customerDisplayName';
import { useUnifiedBookings, BookingType, BookingStatus } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Hotel, Plane, Car, Truck, Eye, TrendingUp, TrendingDown, CalendarCheck, Clock, CalendarDays } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { usePageTitle } from '@/hooks/usePageTitle';

const typeConfig: Record<BookingType, { label: string; icon: React.ElementType; className: string }> = {
  hotel: { label: 'فندق', icon: Hotel, className: 'bg-primary/10 text-primary border-primary/20' },
  flight: { label: 'طيران', icon: Plane, className: 'bg-accent text-accent-foreground border-border' },
  car_rental: { label: 'تأجير سيارات', icon: Car, className: 'bg-muted text-foreground border-border' },
  transport: { label: 'نقل', icon: Truck, className: 'bg-secondary text-secondary-foreground border-border' },
};

const statusVariants: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  confirmed: 'default',
  cancelled: 'destructive',
  completed: 'outline',
};

const UnifiedBookings = () => {
  usePageTitle('الحجوزات الموحدة');
  const navigate = useNavigate();
  const orgId = useOrgId();
  const { hasPermission, canCreateBookings } = useSupabasePermissions();
  const canViewFinance = hasPermission('financial_view');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { bookings, totalCount, isLoading, error, refetch, isFetching } = useUnifiedBookings({
    type: typeFilter !== 'all' ? typeFilter as BookingType : undefined,
    status: statusFilter !== 'all' ? statusFilter as BookingStatus : undefined,
    search: search || undefined,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const searchTerm = sanitizeSearchTerm(search);
  const summary = useQuery({
    queryKey: ['unified-bookings', orgId, 'summary', typeFilter, statusFilter, searchTerm, canViewFinance],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<{ currency: string | null; confirmed: number; pending: number; profit: number | null }[]>(
        'unified_booking_list_summary', {
          _org: orgId, _type: typeFilter === 'all' ? null : typeFilter,
          _status: statusFilter === 'all' ? null : statusFilter,
          _search: searchTerm || null, _start_date: null, _end_date: null,
        },
      );
      if (error) throw error;
      return data ?? [];
    },
  });
  const confirmedCount = summary.data?.reduce((total, row) => total + Number(row.confirmed), 0);
  const pendingCount = summary.data?.reduce((total, row) => total + Number(row.pending), 0);
  const filtered = !!searchTerm || typeFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setPage(1); };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="الحجوزات الموحدة"
        description="جميع الحجوزات (فنادق، طيران، سيارات، نقل) في مكان واحد"
        icon={CalendarDays}
        actions={canCreateBookings() && (
          <Button onClick={() => navigate('/bookings/new')}>
            <Plus className="h-4 w-4 ml-2" />
            حجز جديد
          </Button>
        )}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CalendarCheck className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">الحجوزات المطابقة</p>
              <p className="text-2xl font-bold">{isLoading || error ? '—' : totalCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">مؤكد</p>
              <p className="text-2xl font-bold">{summary.isError ? '—' : confirmedCount ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><Clock className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <p className="text-sm text-muted-foreground">معلق</p>
              <p className="text-2xl font-bold">{summary.isError ? '—' : pendingCount ?? '—'}</p>
            </div>
          </div>
        </Card>
        {canViewFinance && <Card className="p-4">
          <p className="text-sm text-muted-foreground">ربح الحجوزات المطابقة حسب العملة</p>
          {summary.isError || !summary.data?.length ? <p className="text-lg font-semibold">—</p> :
            summary.data.filter(row => row.currency && row.profit !== null).map(row => (
              <p key={row.currency} className="text-lg font-semibold">
                <bdi>{Number(row.profit).toLocaleString(undefined, { maximumFractionDigits: 2 })} {row.currency}</bdi>
              </p>
            ))}
        </Card>}
      </div>
      {summary.isError && <ListLoadError message="تعذر تحميل ملخص الحجوزات" retry={() => void summary.refetch()} pending={summary.isFetching} />}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم الحجز..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="ps-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="نوع الحجز" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="hotel">فندق</SelectItem>
                <SelectItem value="flight">طيران</SelectItem>
                <SelectItem value="car_rental">تأجير سيارات</SelectItem>
                <SelectItem value="transport">نقل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : error ? (
            <ListLoadError message="تعذر تحميل الحجوزات" retry={() => void refetch()} pending={isFetching} />
          ) : bookings.length === 0 ? (
            <div className="space-y-2 text-center py-8 text-muted-foreground">
              <p>{filtered ? 'لا توجد حجوزات مطابقة للفلاتر' : 'لا توجد حجوزات بعد'}</p>
              {filtered && <Button variant="outline" size="sm" onClick={clearFilters}>مسح الفلاتر</Button>}
              {!filtered && canCreateBookings() && <Button asChild size="sm"><Link to="/bookings/new">إنشاء أول حجز</Link></Button>}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الحجز</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المورد</TableHead>
                    <TableHead>سعر البيع</TableHead>
                    <TableHead>التكلفة</TableHead>
                    <TableHead>الربح</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => {
                    const tc = typeConfig[b.booking_type];
                    const TypeIcon = tc.icon;
                    return (
                      <TableRow key={b.id} className="cursor-pointer transition-colors hover:bg-muted/60"
                        onClick={() => navigate(`/bookings/${b.id}`)}>
                        <TableCell className="font-mono text-sm"><Link className="hover:underline" to={`/bookings/${b.id}`}>{b.booking_number}</Link></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tc.className}>
                            <TypeIcon className="h-3 w-3 ml-1" />
                            {tc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{customerDisplayName(b.customer_name || b.customers?.name) || '—'}</TableCell>
                        <TableCell>{b.supplier_name || '—'}</TableCell>
                        <TableCell>{b.selling_price?.toLocaleString()} {b.currency}</TableCell>
                        <TableCell>{b.cost_price?.toLocaleString()} {b.currency}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 font-semibold ${b.profit >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                            {b.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {b.profit?.toLocaleString()} {b.currency}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[b.status] || 'secondary'}>{bookingStatusLabel(b.status)}</Badge>
                        </TableCell>
                        <TableCell>{b.start_date || '—'}</TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="icon">
                            <Link aria-label="عرض تفاصيل الحجز" to={`/bookings/${b.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  عرض {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} من {totalCount}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Button>
                  <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>التالي</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedBookings;
