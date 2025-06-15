
import SupplierPermissionCheck from './SupplierPermissionCheck';
import SupplierAnalytics from './SupplierAnalytics';

const SuppliersAnalytics = () => (
  <SupplierPermissionCheck action="view">
    <SupplierAnalytics />
  </SupplierPermissionCheck>
);

export default SuppliersAnalytics;
