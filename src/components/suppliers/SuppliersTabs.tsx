
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Building, Star, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import SuppliersOverview from './SuppliersOverview';
import SupplierCurrencyManager from './SupplierCurrencyManager';
import SupplierContracts from './SupplierContracts';
import SupplierPayments from './SupplierPayments';
import SupplierRatings from './SupplierRatings';
import SupplierAnalytics from './SupplierAnalytics';
import SupplierPermissionCheck from './SupplierPermissionCheck';

const SuppliersTabs = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const NoSupplierSelected = () => (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-muted-foreground">يرجى اختيار مورد من قائمة "نظرة عامة" أولاً</p>
      </CardContent>
    </Card>
  );

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
        {selectedSupplier ? (
          <SupplierPermissionCheck action="edit">
            <SupplierCurrencyManager supplierId={selectedSupplier} />
          </SupplierPermissionCheck>
        ) : <NoSupplierSelected />}
      </TabsContent>

      <TabsContent value="contracts">
        <SupplierPermissionCheck action="view">
          <SupplierContracts supplierId={selectedSupplier} />
        </SupplierPermissionCheck>
      </TabsContent>

      <TabsContent value="payments">
        <SupplierPermissionCheck action="view">
          <SupplierPayments supplierId={selectedSupplier} />
        </SupplierPermissionCheck>
      </TabsContent>

      <TabsContent value="ratings">
        <SupplierPermissionCheck action="view">
          <SupplierRatings supplierId={selectedSupplier} />
        </SupplierPermissionCheck>
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
