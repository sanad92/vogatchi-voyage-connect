
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Calendar, DollarSign, FileText } from 'lucide-react';
import { useRentContracts } from '@/hooks/useRentContracts';

const RentContractsGrid = () => {
  const { rentContracts, contractsLoading } = useRentContracts();

  const getPropertyTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'office': 'مكتب',
      'warehouse': 'مستودع',
      'shop': 'محل تجاري',
      'apartment': 'شقة'
    };
    return types[type] || type;
  };

  const isContractExpiringSoon = (endDate: string) => {
    if (!endDate) return false;
    const today = new Date();
    const contractEndDate = new Date(endDate);
    const daysUntilExpiry = Math.ceil((contractEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  };

  const isContractExpired = (endDate: string) => {
    if (!endDate) return false;
    const today = new Date();
    const contractEndDate = new Date(endDate);
    return contractEndDate < today;
  };

  if (contractsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  if (!rentContracts || rentContracts.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">لا توجد عقود إيجار</h3>
        <p className="text-gray-600">ابدأ بإضافة عقد إيجار جديد</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rentContracts.map((contract) => (
        <Card key={contract.id} className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge 
                variant={
                  isContractExpired(contract.contract_end_date || contract.end_date || '') ? "destructive" : 
                  isContractExpiringSoon(contract.contract_end_date || contract.end_date || '') ? "outline" : "default"
                }
              >
                {isContractExpired(contract.contract_end_date || contract.end_date || '') ? 'منتهي' : 
                 isContractExpiringSoon(contract.contract_end_date || contract.end_date || '') ? 'ينتهي قريباً' : 'نشط'}
              </Badge>
              <div className="text-sm text-gray-500">
                {getPropertyTypeLabel(contract.property_type || 'office')}
              </div>
            </div>
            <CardTitle className="text-lg">{contract.contract_number}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">العنوان</p>
              <p className="font-medium">{contract.property_address}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">المالك</p>
              <p className="font-medium">{contract.landlord_name}</p>
            </div>

            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-600">الإيجار الشهري</p>
                <p className="font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {contract.monthly_rent.toLocaleString()} {contract.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">التأمين</p>
                <p className="font-medium">{contract.security_deposit?.toLocaleString()} {contract.currency}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">تاريخ الانتهاء</p>
              <p className="font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {contract.contract_end_date || contract.end_date ? new Date(contract.contract_end_date || contract.end_date || '').toLocaleDateString('ar-EG') : '—'}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <span className="text-gray-600">المرافق: </span>
                <span className={contract.utilities_included ? 'text-green-600' : 'text-red-600'}>
                  {contract.utilities_included ? 'مشمولة' : 'غير مشمولة'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600">الصيانة: </span>
                <span>{contract.maintenance_responsibility === 'tenant' ? 'المستأجر' : 'المالك'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <FileText className="h-4 w-4 mr-1" />
                المدفوعات
              </Button>
              <Button variant="outline" size="sm">
                تفاصيل
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RentContractsGrid;
