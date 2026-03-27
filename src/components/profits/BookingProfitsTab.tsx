
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { BookingProfit } from '@/hooks/useProfitAnalytics';

interface BookingProfitsTabProps {
  bookings: BookingProfit[];
  searchTerm: string;
  typeFilter: string;
}

const typeColors: Record<string, string> = {
  hotel: 'bg-blue-100 text-blue-800',
  flight: 'bg-purple-100 text-purple-800',
  car_rental: 'bg-orange-100 text-orange-800',
  transport: 'bg-green-100 text-green-800',
};

const BookingProfitsTab = ({ bookings, searchTerm, typeFilter }: BookingProfitsTabProps) => {
  const filtered = bookings.filter(b => {
    if (typeFilter && typeFilter !== 'all' && b.type !== typeFilter) return false;
    if (searchTerm && !b.customerName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">النوع</TableHead>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">الموظف</TableHead>
            <TableHead className="text-right">سعر البيع</TableHead>
            <TableHead className="text-right">التكلفة</TableHead>
            <TableHead className="text-right">الربح</TableHead>
            <TableHead className="text-right">الهامش</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
          ) : filtered.slice(0, 50).map((b) => (
            <TableRow key={`${b.type}-${b.id}`}>
              <TableCell><Badge variant="secondary" className={typeColors[b.type]}>{b.typeName}</Badge></TableCell>
              <TableCell className="font-medium">{b.customerName}</TableCell>
              <TableCell>{b.employeeName || '-'}</TableCell>
              <TableCell className="tabular-nums">{b.sellingPrice.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{b.cost.toLocaleString()}</TableCell>
              <TableCell className={`tabular-nums font-semibold ${b.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{b.profit.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{b.profitMargin.toFixed(1)}%</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">{b.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filtered.length > 50 && <p className="text-xs text-muted-foreground text-center mt-2">عرض أول 50 حجز من {filtered.length}</p>}
    </div>
  );
};

export default BookingProfitsTab;
