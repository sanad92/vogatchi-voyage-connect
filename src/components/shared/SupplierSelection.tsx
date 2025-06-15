
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useState, useEffect } from 'react';

interface SupplierSelectionProps {
  selectedSupplierId: string;
  selectedSupplierName: string;
  onSupplierSelect: (id: string, name: string) => void;
  label?: string;
  supplierType?: string;
  required?: boolean;
}

const SupplierSelection = ({
  selectedSupplierId,
  selectedSupplierName,
  onSupplierSelect,
  label = "المورد",
  supplierType,
  required = false
}: SupplierSelectionProps) => {
  const { suppliers, suppliersLoading } = useSuppliers();
  const [customSupplierName, setCustomSupplierName] = useState(selectedSupplierName);

  // تصفية الموردين حسب النوع وضمان وجود ID صالح
  const filteredSuppliers = suppliers?.filter(supplier => {
    // تأكد من وجود ID صالح (ليس فارغ أو undefined)
    if (!supplier.id || supplier.id.trim() === '') {
      console.warn('Supplier with empty ID found:', supplier);
      return false;
    }
    
    // تصفية حسب النوع إذا كان محدد
    if (supplierType) {
      return supplier.supplier_type?.toLowerCase().includes(supplierType.toLowerCase());
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
    onSupplierSelect('', name); // Pass empty ID for custom supplier
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
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="text-sm text-gray-500">
          {suppliersLoading ? 'جاري التحميل...' : 'لا توجد موردين متاحين'}
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
