import AgingReport from '@/components/finance/AgingReport';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function SupplierAging() {
  usePageTitle('أعمار ديون الموردين');
  return <AgingReport kind="supplier" />;
}
