import AgingReport from '@/components/finance/AgingReport';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function CustomerAging() {
  usePageTitle('أعمار ديون العملاء');
  return <AgingReport kind="customer" />;
}
