
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, List, Settings, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ImprovedSalaryCalculation from './ImprovedSalaryCalculation';
import SalaryManagementList from './SalaryManagementList';
import SalarySettings from './SalarySettings';
import AttendanceManagement from './AttendanceManagement';

const SalaryManagementImproved = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            إدارة الرواتب المحسّنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              نظام إدارة الرواتب المحسّن يستخدم stored procedures لضمان دقة الحسابات والأمان.
              جميع الرواتب محسوبة ومحفوظة بالجنيه المصري.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="calculation" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                حساب الرواتب
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                قائمة الرواتب
              </TabsTrigger>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                الحضور والانصراف
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

            <TabsContent value="attendance" className="space-y-4">
              <AttendanceManagement />
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
