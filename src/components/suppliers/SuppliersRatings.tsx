
import SupplierPermissionCheck from './SupplierPermissionCheck';
import SupplierRatings from './SupplierRatings';

interface SuppliersRatingsProps {
  supplierId: string | null;
}

const SuppliersRatings = ({ supplierId }: SuppliersRatingsProps) => (
  <SupplierPermissionCheck action="view">
    <SupplierRatings supplierId={supplierId} />
  </SupplierPermissionCheck>
);

export default SuppliersRatings;
