
import SupplierPermissionCheck from './SupplierPermissionCheck';
import SupplierContracts from './SupplierContracts';

interface SuppliersContractsProps {
  supplierId: string | null;
}

const SuppliersContracts = ({ supplierId }: SuppliersContractsProps) => (
  <SupplierPermissionCheck action="view">
    <SupplierContracts supplierId={supplierId} />
  </SupplierPermissionCheck>
);

export default SuppliersContracts;
