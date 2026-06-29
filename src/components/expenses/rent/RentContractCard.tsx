
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building } from 'lucide-react';

interface RentContractCardProps {
  contract: any;
}

const RentContractCard = ({ contract }: RentContractCardProps) => {
  const contractEndDate = contract.contract_end_date || contract.end_date;

  const isContractActive = (contract: any) => {
    const today = new Date();
    const endDate = new Date(contract.contract_end_date || contract.end_date);
    return endDate >= today && contract.is_active;
  };

  const getDaysUntilExpiry = (contract: any) => {
    const today = new Date();
    const endDate = new Date(contract.contract_end_date || contract.end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'office': 'مكتب',
      'warehouse': 'مستودع',
      'shop': 'محل تجاري',
      'apartment': 'شقة'
    };
    return types[type] || type;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant={isContractActive(contract) ? "default" : "secondary"}>
            {isContractActive(contract) ? 'نشط' : 'منتهي'}
          </Badge>
          <div className="text-sm text-gray-500">
            {getPropertyTypeLabel(contract.property_type)}
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
            <p className="font-medium">{contract.monthly_rent.toLocaleString()} {contract.currency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">مدة العقد</p>
            <p className="font-medium">{contract.renewal_period_months || contract.contract_duration_months || 12} شهر</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">تاريخ الانتهاء</p>
          <p className="font-medium">
            {formatDate(contractEndDate)}
          </p>
          {isContractActive(contract) && (
            <p className="text-sm text-orange-600">
              {getDaysUntilExpiry(contract) > 0 ? 
                `متبقي ${getDaysUntilExpiry(contract)} يوم` : 
                'انتهى العقد'
              }
            </p>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Calendar className="h-4 w-4 mr-1" />
            المدفوعات
          </Button>
          <Button variant="outline" size="sm">
            تجديد
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RentContractCard;
