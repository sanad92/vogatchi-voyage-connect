
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EmployeeProfit } from '@/hooks/useProfitAnalytics';

interface EmployeeProfitsTabProps {
  employees: EmployeeProfit[];
  searchTerm: string;
}

const EmployeeProfitsTab = ({ employees, searchTerm }: EmployeeProfitsTabProps) => {
  const filtered = employees.filter(e =>
    !searchTerm || e.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الموظف</TableHead>
            <TableHead className="text-right">عدد الحجوزات</TableHead>
            <TableHead className="text-right">إجمالي الإيرادات</TableHead>
            <TableHead className="text-right">إجمالي التكاليف</TableHead>
            <TableHead className="text-right">إجمالي الربح</TableHead>
            <TableHead className="text-right">العمولات</TableHead>
            <TableHead className="text-right">هامش الربح</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
          ) : filtered.map((e) => (
            <TableRow key={e.employeeId}>
              <TableCell className="font-medium">{e.employeeName}</TableCell>
              <TableCell className="tabular-nums">{e.totalBookings}</TableCell>
              <TableCell className="tabular-nums">{e.totalRevenue.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{e.totalCost.toLocaleString()}</TableCell>
              <TableCell className={`tabular-nums font-semibold ${e.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{e.totalProfit.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums text-amber-600">{e.totalCommission.toLocaleString()}</TableCell>
              <TableCell className="tabular-nums">{e.profitMargin.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default EmployeeProfitsTab;
