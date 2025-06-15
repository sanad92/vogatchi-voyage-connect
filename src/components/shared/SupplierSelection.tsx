
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Building } from 'lucide-react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useState } from 'react';

interface SupplierSelectionProps {
  selectedSupplierId?: string;
  selectedSupplierName?: string;
  onSupplierSelect: (supplierId: string, supplierName: string) => void;
  onSupplierNameChange?: (name: string) => void;
  allowNewSupplier?: boolean;
  required?: boolean;
  label?: string;
}

const SupplierSelection = ({
  selectedSupplierId,
  selectedSupplierName,
  onSupplierSelect,
  onSupplierNameChange,
  allowNewSupplier = true,
  required = true,
  label = "المورد"
}: SupplierSelectionProps) => {
  const { suppliers, suppliersLoading } = useSuppliers();
  const [showNewSupplier, setShowNewSupplier] = useState(false);

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    if (supplier) {
      onSupplierSelect(supplierId, supplier.name);
    }
  };

  if (showNewSupplier) {
    return (
      <div className="space-y-2">
        <Label htmlFor="supplier_name">اسم المورد الجديد</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            id="supplier_name"
            value={selectedSupplierName || ''}
            onChange={(e) => onSupplierNameChange?.(e.target.value)}
            placeholder="أدخل اسم المورد"
            required={required}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowNewSupplier(false)}
          >
            إلغاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="supplier_id">{label}</Label>
      <div className="flex gap-2">
        <Select
          value={selectedSupplierId || ''}
          onValueChange={handleSupplierChange}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="اختر مورد" />
          </SelectTrigger>
          <SelectContent>
            {suppliersLoading ? (
              <SelectItem value="" disabled>جاري التحميل...</SelectItem>
            ) : (
              suppliers?.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{supplier.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {allowNewSupplier && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowNewSupplier(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            جديد
          </Button>
        )}
      </div>
    </div>
  );
};

export default SupplierSelection;
