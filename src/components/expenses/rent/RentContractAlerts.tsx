
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, FileText, Bell } from 'lucide-react';
import { useRentContracts } from '@/hooks/useRentContracts';
import { useRentPayments } from '@/hooks/useRentPayments';

const RentContractAlerts = () => {
  const { rentContracts } = useRentContracts();
  const { rentPayments } = useRentPayments();

  const getContractEndDate = (contract: any) => contract.contract_end_date || contract.end_date;

  // العقود التي تنتهي خلال 90 يوم
  const expiringContracts = rentContracts?.filter(contract => {
    const endDate = new Date(getContractEndDate(contract));
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  }) || [];

  // العقود المنتهية
  const expiredContracts = rentContracts?.filter(contract => {
    const endDate = new Date(getContractEndDate(contract));
    const now = new Date();
    return endDate < now && contract.is_active;
  }) || [];

  // المدفوعات المتأخرة
  const overduePayments = rentPayments?.filter(payment => {
    const dueDate = new Date(payment.due_date);
    const now = new Date();
    return payment.status === 'pending' && dueDate < now;
  }) || [];

  // المدفوعات المستحقة خلال أسبوع
  const upcomingPayments = rentPayments?.filter(payment => {
    const dueDate = new Date(payment.due_date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return payment.status === 'pending' && diffDays > 0 && diffDays <= 7;
  }) || [];

  const hasAlerts = expiringContracts.length > 0 || expiredContracts.length > 0 || 
                   overduePayments.length > 0 || upcomingPayments.length > 0;

  if (!hasAlerts) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد تنبيهات حالياً</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* العقود المنتهية */}
      {expiredContracts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              عقود منتهية ({expiredContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiredContracts.map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium">{contract.contract_number}</p>
                    <p className="text-sm text-gray-600">{contract.property_address}</p>
                    <p className="text-sm text-red-600">
                      انتهى في {new Date(getContractEndDate(contract)).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      تجديد
                    </Button>
                    <Button size="sm" variant="destructive">
                      إنهاء
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* العقود القريبة من الانتهاء */}
      {expiringContracts.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Calendar className="h-5 w-5" />
              عقود تنتهي قريباً ({expiringContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringContracts.map((contract) => {
                const endDate = new Date(getContractEndDate(contract));
                const now = new Date();
                const diffTime = endDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={contract.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">{contract.contract_number}</p>
                      <p className="text-sm text-gray-600">{contract.property_address}</p>
                      <p className="text-sm text-orange-600">
                        ينتهي خلال {diffDays} يوم - {endDate.toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{diffDays} يوم</Badge>
                      <Button size="sm">
                        تجديد
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* المدفوعات المتأخرة */}
      {overduePayments.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              مدفوعات متأخرة ({overduePayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overduePayments.map((payment) => {
                const dueDate = new Date(payment.due_date);
                const now = new Date();
                const diffTime = now.getTime() - dueDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium">{payment.contract?.contract_number}</p>
                      <p className="text-sm text-gray-600">
                        {payment.amount.toLocaleString()} {payment.currency} - 
                        {new Date(payment.payment_month).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-sm text-red-600">
                        متأخر {diffDays} يوم
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="destructive">متأخر</Badge>
                      <Button size="sm">
                        تسديد
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* المدفوعات المستحقة قريباً */}
      {upcomingPayments.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Calendar className="h-5 w-5" />
              مدفوعات مستحقة قريباً ({upcomingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingPayments.map((payment) => {
                const dueDate = new Date(payment.due_date);
                const now = new Date();
                const diffTime = dueDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium">{payment.contract?.contract_number}</p>
                      <p className="text-sm text-gray-600">
                        {payment.amount.toLocaleString()} {payment.currency} - 
                        {new Date(payment.payment_month).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-sm text-yellow-600">
                        مستحق خلال {diffDays} يوم
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{diffDays} يوم</Badge>
                      <Button size="sm">
                        تسديد
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RentContractAlerts;
