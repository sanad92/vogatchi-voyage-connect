
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Star, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import SuppliersOverview from './SuppliersOverview';
import SuppliersCurrencies from './SuppliersCurrencies';
import SuppliersContracts from './SuppliersContracts';
import SuppliersPayments from './SuppliersPayments';
import SuppliersRatings from './SuppliersRatings';
import SupplierAnalytics from './SupplierAnalytics';
import SupplierPermissionCheck from './SupplierPermissionCheck';

const SuppliersTabs = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          نظرة عامة
        </TabsTrigger>
        <TabsTrigger value="currencies" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          العملات
        </TabsTrigger>
        <TabsTrigger value="contracts" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          العقود
        </TabsTrigger>
        <TabsTrigger value="payments" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          المدفوعات
        </TabsTrigger>
        <TabsTrigger value="ratings" className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          التقييمات
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          التحليلات
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <SuppliersOverview onSupplierSelect={setSelectedSupplier} />
      </TabsContent>
      <TabsContent value="currencies">
        <SuppliersCurrencies supplierId={selectedSupplier} />
      </TabsContent>
      <TabsContent value="contracts">
        <SuppliersContracts supplierId={selectedSupplier} />
      </TabsContent>
      <TabsContent value="payments">
        <SuppliersPayments supplierId={selectedSupplier} />
      </TabsContent>
      <TabsContent value="ratings">
        <SuppliersRatings supplierId={selectedSupplier} />
      </TabsContent>
      <TabsContent value="analytics">
        <SupplierPermissionCheck action="view">
          <SupplierAnalytics />
        </SupplierPermissionCheck>
      </TabsContent>
    </Tabs>
  );
};

export default SuppliersTabs;
