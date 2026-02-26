import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Phone, Mail, Package, DollarSign, Users } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import { useCustomers } from '@/hooks/useCustomers';
import { formatDate } from '@/lib/utils';

const CRMCustomerList = () => {
  const navigate = useNavigate();
  const { customers, isLoading } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = (customers || []).filter(c => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(s) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(s);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!customers?.length) {
    return (
      <EmptyState
        icon={Users}
        title="لا يوجد عملاء بعد"
        description="ابدأ بإضافة عملائك لإدارة علاقاتهم وتتبع حجوزاتهم وفواتيرهم"
        actionLabel="إضافة أول عميل"
        onAction={() => navigate('/new-customer')}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            قائمة العملاء ({customers.length})
          </CardTitle>
          <div className="relative w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الهاتف أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="لا توجد نتائج"
            description="لم يتم العثور على عملاء مطابقين لبحثك"
          />
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">التواصل</TableHead>
                  <TableHead className="text-right">الشريحة</TableHead>
                  <TableHead className="text-right">الحجوزات</TableHead>
                  <TableHead className="text-right">الإنفاق</TableHead>
                  <TableHead className="text-right">آخر حجز</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/customers/${customer.id}`)}>
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      {customer.nationality && (
                        <span className="text-xs text-muted-foreground">{customer.nationality}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {customer.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.segment ? (
                        <Badge style={{ backgroundColor: customer.segment.color }} className="text-white">
                          {customer.segment.name_ar}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">غير مصنف</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {customer.total_bookings || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        {(customer.total_spent || 0).toLocaleString()} ج.م
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {customer.last_booking_date ? formatDate(customer.last_booking_date) : 'لا يوجد'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${customer.id}`);
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {filtered.length > 50 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            يتم عرض أول 50 عميل من أصل {filtered.length}. استخدم البحث لتصفية النتائج.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CRMCustomerList;
