import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Edit, Trash2, FileText, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  confirmed: { label: 'مؤكد', variant: 'default' },
  pending: { label: 'معلق', variant: 'secondary' },
  cancelled: { label: 'ملغي', variant: 'destructive' },
  completed: { label: 'مكتمل', variant: 'outline' },
};

const BookingsTable = () => {
  const orgId = useOrgId();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['dashboard-bookings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('id, internal_booking_number, customer_name, hotel_name, check_in_date, check_out_date, total_cost_customer, booking_statuses(name, name_ar, color)')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!bookings) return;
    if (selected.size === bookings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(bookings.map(b => b.id)));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">آخر الحجوزات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bookings?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            آخر الحجوزات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">لا توجد حجوزات بعد</p>
            <p className="text-xs text-muted-foreground/60 mt-1">ستظهر الحجوزات الجديدة هنا</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          آخر الحجوزات
        </CardTitle>
        {selected.size > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selected.size} محدد
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={bookings.length > 0 && selected.size === bookings.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-right">المرجع</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right hidden sm:table-cell">الفندق</TableHead>
                <TableHead className="text-right hidden md:table-cell">تاريخ الدخول</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-left">المبلغ</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const status = (booking.booking_statuses as any);
                return (
                  <TableRow key={booking.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(booking.id)}
                        onCheckedChange={() => toggleSelect(booking.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-primary">
                      {booking.internal_booking_number}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {booking.customer_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {booking.hotel_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {booking.check_in_date ? new Date(booking.check_in_date).toLocaleDateString('ar-EG') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={status?.color ? { backgroundColor: `${status.color}20`, color: status.color, borderColor: `${status.color}40` } : {}}
                      >
                        {status?.name_ar || 'غير محدد'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left font-semibold text-sm tabular-nums">
                      {booking.total_cost_customer?.toLocaleString() || '0'} ج.م
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="h-4 w-4 ml-2" /> عرض</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="h-4 w-4 ml-2" /> تعديل</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 ml-2" /> حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingsTable;
