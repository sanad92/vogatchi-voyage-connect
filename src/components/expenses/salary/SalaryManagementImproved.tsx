
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, List, Settings } from 'lucide-react';
import ImprovedSalaryCalculation from './ImprovedSalaryCalculation';
import SalaryManagementList from './SalaryManagementList';
import SalarySettings from './SalarySettings';

const SalaryManagementImproved = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            إدارة الرواتب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                حساب الرواتب
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                قائمة الرواتب
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                إعدادات الرواتب
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calculation" className="space-y-4">
              <ImprovedSalaryCalculation />
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <SalaryManagementList />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <SalarySettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryManagementImproved;
