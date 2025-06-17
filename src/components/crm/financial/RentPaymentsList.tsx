
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, Search, Filter } from 'lucide-react';
import { useRentPaymentsImproved } from '@/hooks/useRentPaymentsImproved';

const RentPaymentsList = () => {
  const { rentPayments, paymentsLoading, updatePaymentStatus } = useRentPaymentsImproved();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'pending': return 'معلق';
      case 'overdue': return 'متأخر';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  const filteredPayments = rentPayments?.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.contract?.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.contract?.landlord_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (paymentId: string, newStatus: string) => {
    try {
      await updatePaymentStatus({
        id: paymentId,
        status: newStatus as any,
        payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  if (paymentsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* شريط البحث والفلاتر */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في المدفوعات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="overdue">متأخر</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* قائمة المدفوعات */}
      <div className="space-y-4">
        {filteredPayments?.map((payment) => (
          <Card key={payment.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{payment.contract?.property_address}</h3>
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusText(payment.status)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>المالك: {payment.contract?.landlord_name}</p>
                    <p className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      شهر: {new Date(payment.payment_month).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
                    </p>
                    <p>تاريخ الاستحقاق: {new Date(payment.due_date).toLocaleDateString('ar-EG')}</p>
                    {payment.payment_date && (
                      <p>تاريخ الدفع: {new Date(payment.payment_date).toLocaleDateString('ar-EG')}</p>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <div className="flex items-center justify-end">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span className="text-lg font-semibold">
                      {payment.amount.toLocaleString()} {payment.currency}
                    </span>
                  </div>
                  
                  {payment.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleStatusUpdate(payment.id, 'paid')}
                      >
                        تسديد
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusUpdate(payment.id, 'overdue')}
                      >
                        متأخر
                      </Button>
                    </div>
                  )}

                  {payment.status === 'overdue' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusUpdate(payment.id, 'paid')}
                    >
                      تسديد
                    </Button>
                  )}
                </div>
              </div>

              {payment.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{payment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(!filteredPayments || filteredPayments.length === 0) && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد مدفوعات</h3>
          <p className="text-gray-600">لا توجد مدفوعات مطابقة للبحث</p>
        </div>
      )}
    </div>
  );
};

export default RentPaymentsList;
