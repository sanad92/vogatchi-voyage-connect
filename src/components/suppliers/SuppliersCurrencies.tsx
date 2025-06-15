
import { Card, CardContent } from '@/components/ui/card';
import SupplierPermissionCheck from './SupplierPermissionCheck';
import SupplierCurrencyManager from './SupplierCurrencyManager';

interface SuppliersCurrenciesProps {
  supplierId: string | null;
}

const SuppliersCurrencies = ({ supplierId }: SuppliersCurrenciesProps) => {
  if (supplierId) {
    return (
      <SupplierPermissionCheck action="edit">
        <SupplierCurrencyManager supplierId={supplierId} />
      </SupplierPermissionCheck>
    );
  }
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-gray-500">يرجى اختيار مورد لإدارة العملات المدعومة</p>
      </CardContent>
    </Card>
  );
};

export default SuppliersCurrencies;
