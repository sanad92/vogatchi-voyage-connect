
import SupplierPermissionCheck from './SupplierPermissionCheck';
import SupplierPayments from './SupplierPayments';

interface SuppliersPaymentsProps {
  supplierId: string | null;
}

const SuppliersPayments = ({ supplierId }: SuppliersPaymentsProps) => (
  <SupplierPermissionCheck action="view">
    <SupplierPayments supplierId={supplierId} />
  </SupplierPermissionCheck>
);

export default SuppliersPayments;
