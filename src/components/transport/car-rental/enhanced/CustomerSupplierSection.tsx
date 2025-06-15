
import CustomerSelection from '@/components/shared/CustomerSelection';
import SupplierSelection from '@/components/shared/SupplierSelection';
import { Customer } from '@/types/customer';

interface CustomerSupplierSectionProps {
  customerId: string;
  customerName: string;
  supplierId: string;
  supplierName: string;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  onCustomerNameChange: (name: string) => void;
  onSupplierSelect: (id: string, name: string) => void;
  onSupplierNameChange: (name: string) => void;
  errors?: Record<string, string>;
  register: any;
  setValue: any;
}

const CustomerSupplierSection = ({
  customerId,
  customerName,
  supplierId,
  supplierName,
  selectedCustomer,
  onCustomerSelect,
  onCustomerNameChange,
  onSupplierSelect,
  onSupplierNameChange,
  errors = {},
  register,
  setValue
}: CustomerSupplierSectionProps) => {
  // Convert simple errors to the expected format
  const fieldErrors = Object.keys(errors).reduce((acc, key) => {
    acc[key] = { message: errors[key] };
    return acc;
  }, {} as any);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">معلومات العميل والمورد</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <CustomerSelection
            selectedCustomer={selectedCustomer}
            onCustomerSelect={onCustomerSelect}
            register={register}
            setValue={setValue}
            errors={fieldErrors}
          />
          {errors.customer_name && (
            <p className="text-sm text-red-600 mt-1">{errors.customer_name}</p>
          )}
        </div>
        
        <div>
          <SupplierSelection
            selectedSupplierId={supplierId}
            selectedSupplierName={supplierName}
            onSupplierSelect={onSupplierSelect}
            onSupplierNameChange={onSupplierNameChange}
            required
          />
          {errors.supplier_name && (
            <p className="text-sm text-red-600 mt-1">{errors.supplier_name}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSupplierSection;
