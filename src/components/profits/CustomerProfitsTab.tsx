
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CustomerProfit } from '@/hooks/useProfitAnalytics';

interface CustomerProfitsTabProps {
  customers: CustomerProfit[];
  searchTerm: string;
}

const CustomerProfitsTab = ({ customers, searchTerm }: CustomerProfitsTabProps) => {
  const filtered = customers.filter(c =>
    !searchTerm || c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">عدد الحجوزات</TableHead>
            <TableHead className="text-right">إجمالي الإيرادات</TableHead>
            <TableHead className="text-right">إجمالي التكاليف</TableHead>
            <TableHead className="text-right">إجمالي الربح</TableHead>
            <TableHead className="text-right">هامش الربح</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
          ) : filtered.map((c) => (
            <TableRow key={c.customerId || c.customerName}>
              <TableCell className="font-medium">{c.customerName}</TableCell>
              <TableCell className="tabular-nums">{c.totalBookings}</TableCell>
              <TableCell className="tabular-nums">{c.totalRevenue.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{c.totalCost.toLocaleString()}</TableCell>
              <TableCell className={`tabular-nums font-semibold ${c.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{c.totalProfit.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{c.profitMargin.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomerProfitsTab;
