
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierCurrencies } from '@/hooks/useSupplierCurrencies';
import { useState, useEffect } from 'react';
import { CURRENCY_SYMBOLS } from '@/types/currency';

interface SupplierSelectionProps {
  selectedSupplierId: string;
  selectedSupplierName: string;
  onSupplierSelect: (id: string, name: string) => void;
  label?: string;
  supplierType?: string;
  required?: boolean;
  preferredCurrency?: string;
}

const SupplierSelection = ({
  selectedSupplierId,
  selectedSupplierName,
  onSupplierSelect,
  label = "المورد",
  supplierType,
  required = false,
  preferredCurrency
}: SupplierSelectionProps) => {
  const { suppliers, suppliersLoading } = useSuppliers();
  const { supplierCurrencies } = useSupplierCurrencies(selectedSupplierId);
  const [customSupplierName, setCustomSupplierName] = useState(selectedSupplierName);

  // تصفية الموردين حسب النوع والعملة المفضلة
  const filteredSuppliers = suppliers?.filter(supplier => {
    // تأكد من وجود ID صالح
    if (!supplier.id || supplier.id.trim() === '') {
      console.warn('Supplier with empty ID found:', supplier);
      return false;
    }
    
    // تصفية حسب النوع إذا كان محدد
    if (supplierType) {
      const typeMatch = supplier.supplier_type?.toLowerCase().includes(supplierType.toLowerCase());
      if (!typeMatch) return false;
    }
    
    return true;
  }) || [];

  useEffect(() => {
    setCustomSupplierName(selectedSupplierName);
  }, [selectedSupplierName]);

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = filteredSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      onSupplierSelect(supplierId, supplier.name);
      setCustomSupplierName(supplier.name);
    }
  };

  const handleCustomSupplierNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setCustomSupplierName(name);
    onSupplierSelect('', name);
  };

  const getSupplierCurrencies = (supplierId: string) => {
    // هذا سيتطلب استعلام منفصل لكل مورد، لكن للبساطة سنعرض العملة الأساسية فقط
    return null;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="supplier">{label} {required && '*'}</Label>
      
      {filteredSuppliers.length > 0 ? (
        <Select value={selectedSupplierId} onValueChange={handleSupplierSelect}>
          <SelectTrigger>
            <SelectValue placeholder={`اختر ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {filteredSuppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{supplier.name}</span>
                  {supplier.supplier_type && (
                    <Badge variant="outline" className="ml-2">
                      {supplier.supplier_type}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="text-sm text-gray-500">
          {suppliersLoading ? 'جاري التحميل...' : 'لا توجد موردين متاحين'}
        </div>
      )}
      
      {/* عرض العملات المدعومة للمورد المختار */}
      {selectedSupplierId && supplierCurrencies.length > 0 && (
        <div className="p-2 bg-blue-50 rounded-md">
          <p className="text-sm font-medium text-blue-800 mb-2">العملات المدعومة:</p>
          <div className="flex flex-wrap gap-1">
            {supplierCurrencies.map((currency) => (
              <Badge 
                key={currency.id} 
                variant={currency.is_primary ? "default" : "secondary"}
                className="text-xs"
              >
                {CURRENCY_SYMBOLS[currency.currency]}
                {currency.is_primary && " (أساسية)"}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* حقل إدخال اسم مورد مخصص */}
      <div>
        <Label htmlFor="custom_supplier">أو أدخل اسم مورد مخصص</Label>
        <Input
          id="custom_supplier"
          value={customSupplierName}
          onChange={handleCustomSupplierNameChange}
          placeholder="اسم المورد"
        />
      </div>
    </div>
  );
};

export default SupplierSelection;
