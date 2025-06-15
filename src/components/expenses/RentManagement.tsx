
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home } from 'lucide-react';

const RentManagement = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            إدارة الإيجارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">قيد التطوير</h3>
            <p className="text-gray-600">
              سيتم إضافة نظام إدارة الإيجارات قريباً
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentManagement;
