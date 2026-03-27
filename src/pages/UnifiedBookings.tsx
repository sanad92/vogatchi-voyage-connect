
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedBookings, BookingType, BookingStatus } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Hotel, Plane, Car, Truck, Eye } from 'lucide-react';
import PaginationControlsUI from '@/components/common/PaginationControlsUI';

const typeConfig: Record<BookingType, { label: string; icon: React.ElementType; color: string }> = {
  hotel: { label: 'فندق', icon: Hotel, color: 'bg-blue-100 text-blue-800' },
  flight: { label: 'طيران', icon: Plane, color: 'bg-purple-100 text-purple-800' },
  car_rental: { label: 'تأجير سيارات', icon: Car, color: 'bg-amber-100 text-amber-800' },
  transport: { label: 'نقل', icon: Truck, color: 'bg-green-100 text-green-800' },
};

const statusLabels: Record<BookingStatus, { label: string; variant: string }> = {
  pending: { label: 'معلق', variant: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'مؤكد', variant: 'bg-green-100 text-green-800' },
  cancelled: { label: 'ملغي', variant: 'bg-red-100 text-red-800' },
  completed: { label: 'مكتمل', variant: 'bg-blue-100 text-blue-800' },
};

const UnifiedBookings = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { bookings, totalCount, isLoading } = useUnifiedBookings({
    type: typeFilter !== 'all' ? typeFilter as BookingType : undefined,
    status: statusFilter !== 'all' ? statusFilter as BookingStatus : undefined,
    search: search || undefined,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">الحجوزات الموحدة</h1>
        <Button onClick={() => navigate('/bookings/new')}>
          <Plus className="h-4 w-4 ml-2" />
          حجز جديد
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم الحجز..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pr-9"
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
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد حجوزات</div>
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
                    const sl = statusLabels[b.status] || statusLabels.pending;
                    return (
                      <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/bookings/${b.id}`)}>
                        <TableCell className="font-mono text-sm">{b.booking_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tc.color}>
                            <TypeIcon className="h-3 w-3 ml-1" />
                            {tc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{b.customer_name || (b.customers as any)?.name || '—'}</TableCell>
                        <TableCell>{b.supplier_name || '—'}</TableCell>
                        <TableCell>{b.selling_price?.toLocaleString()} {b.currency}</TableCell>
                        <TableCell>{b.cost_price?.toLocaleString()} {b.currency}</TableCell>
                        <TableCell className={b.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {b.profit?.toLocaleString()} {b.currency}
                        </TableCell>
                        <TableCell>
                          {b.booking_statuses ? (
                            <Badge style={{ backgroundColor: (b.booking_statuses as any).color, color: 'white' }}>
                              {(b.booking_statuses as any).name_ar}
                            </Badge>
                          ) : (
                            <Badge className={sl.variant}>{sl.label}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{b.start_date || '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginationControlsUI
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalCount}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedBookings;
