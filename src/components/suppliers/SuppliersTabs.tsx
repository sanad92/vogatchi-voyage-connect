import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuppliersOverview from './SuppliersOverview';
import SupplierAnalytics from './SupplierAnalytics';

export default function SuppliersTabs() {
  return (
    <Tabs defaultValue="overview" dir="rtl">
      <TabsList>
        <TabsTrigger value="overview">قائمة الموردين</TabsTrigger>
        <TabsTrigger value="analytics">التحليلات</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><SuppliersOverview /></TabsContent>
      <TabsContent value="analytics"><SupplierAnalytics /></TabsContent>
    </Tabs>
  );
}
