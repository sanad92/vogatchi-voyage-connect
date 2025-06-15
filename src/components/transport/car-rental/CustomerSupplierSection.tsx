
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomerSupplierSectionProps {
  formData: {
    customer_name: string;
    supplier_id: string;
  };
  suppliers: any[];
  suppliersLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

const CustomerSupplierSection = ({
  formData,
  suppliers,
  suppliersLoading,
  onInputChange,
  onSelectChange
}: CustomerSupplierSectionProps) => {
  // Force value to undefined if not set
  const supplierValue = formData.supplier_id && formData.supplier_id !== "" ? formData.supplier_id : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="customer_name">اسم العميل</Label>
        <Input
          type="text"
          id="customer_name"
          name="customer_name"
          value={formData.customer_name}
          onChange={onInputChange}
          required
        />
      </div>
      <div>
        <Label htmlFor="supplier_id">المورد</Label>
        <Select
          value={supplierValue}
          onValueChange={(value) => onSelectChange('supplier_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر مورد" />
          </SelectTrigger>
          <SelectContent>
            {!suppliersLoading && suppliers?.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CustomerSupplierSection;
