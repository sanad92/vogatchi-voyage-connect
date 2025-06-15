
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, TrendingUp, Calculator } from 'lucide-react';
import CommissionCalculation from './commission/CommissionCalculation';
import CommissionReports from './commission/CommissionReports';
import CommissionPayments from './commission/CommissionPayments';
import EmployeeCommissionSettings from './commission/EmployeeCommissionSettings';

const CommissionManagement = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            إدارة عمولات الموظفين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                حساب العمولات
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                دفع العمولات
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                التقارير
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                إعدادات الموظفين
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calculation" className="space-y-4">
              <CommissionCalculation />
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <CommissionPayments />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <CommissionReports />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <EmployeeCommissionSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionManagement;
