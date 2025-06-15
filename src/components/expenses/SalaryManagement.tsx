
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calculator, Settings, Clock, DollarSign } from 'lucide-react';
import SalaryCalculation from './salary/SalaryCalculation';
import SalarySettings from './salary/SalarySettings';
import AttendanceManagement from './salary/AttendanceManagement';
import SalaryReports from './salary/SalaryReports';
import CommissionManagement from './CommissionManagement';

const SalaryManagement = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة الرواتب والعمولات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                حساب الرواتب
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                الحضور والانصراف
              </TabsTrigger>
              <TabsTrigger value="commissions" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                إدارة العمولات
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                التقارير
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                الإعدادات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calculation" className="space-y-4">
              <SalaryCalculation />
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <AttendanceManagement />
            </TabsContent>

            <TabsContent value="commissions" className="space-y-4">
              <CommissionManagement />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <SalaryReports />
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

export default SalaryManagement;
