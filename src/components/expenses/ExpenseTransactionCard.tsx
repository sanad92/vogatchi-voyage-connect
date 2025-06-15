
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, Calendar, DollarSign } from 'lucide-react';
import type { ExpenseTransaction } from '@/types/expenses';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface ExpenseTransactionCardProps {
  transaction: ExpenseTransaction;
}

const ExpenseTransactionCard = ({ transaction }: ExpenseTransactionCardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوع</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800">معتمد</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">معلق</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div 
                className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: transaction.category?.color || '#gray' }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{transaction.description}</h3>
                  {getStatusBadge(transaction.status)}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {transaction.category?.name_ar} • {transaction.transaction_number}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(transaction.transaction_date).toLocaleDateString('ar')}
                  </div>
                  {transaction.vendor_name && (
                    <div className="flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      {transaction.vendor_name}
                    </div>
                  )}
                  <div>
                    طريقة الدفع: {
                      transaction.payment_method === 'cash' ? 'نقداً' :
                      transaction.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                      transaction.payment_method === 'credit_card' ? 'بطاقة ائتمان' : 'شيك'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-2xl font-bold">
              <DollarSign className="h-5 w-5 text-green-600" />
              <EgyptianPoundDisplay amount={transaction.amount} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseTransactionCard;
