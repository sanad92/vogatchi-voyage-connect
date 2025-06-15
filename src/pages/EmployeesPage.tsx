
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import EmployeeManagement from '@/components/expenses/EmployeeManagement';

const EmployeesPage = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إدارة الموظفين</h1>
          <p className="text-gray-600">إدارة شاملة لبيانات الموظفين وربطهم بالمستخدمين</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الموظفين</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeManagement />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeesPage;
