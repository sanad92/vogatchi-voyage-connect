
import CustomerSelection from '@/components/shared/CustomerSelection';
import SupplierSelection from '@/components/shared/SupplierSelection';

interface CustomerSupplierSectionProps {
  customerId: string;
  customerName: string;
  supplierId: string;
  supplierName: string;
  onCustomerSelect: (id: string, name: string) => void;
  onCustomerNameChange: (name: string) => void;
  onSupplierSelect: (id: string, name: string) => void;
  onSupplierNameChange: (name: string) => void;
  errors?: Record<string, string>;
}

const CustomerSupplierSection = ({
  customerId,
  customerName,
  supplierId,
  supplierName,
  onCustomerSelect,
  onCustomerNameChange,
  onSupplierSelect,
  onSupplierNameChange,
  errors = {}
}: CustomerSupplierSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">معلومات العميل والمورد</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <CustomerSelection
            selectedCustomerId={customerId}
            selectedCustomerName={customerName}
            onCustomerSelect={onCustomerSelect}
            onCustomerNameChange={onCustomerNameChange}
            required
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
