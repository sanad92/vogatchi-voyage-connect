
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

const UnifiedEmptyState = () => {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">لا توجد نتائج</h3>
        <p className="text-gray-600">لم يتم العثور على مستخدمين يطابقون معايير البحث</p>
      </CardContent>
    </Card>
  );
};

export default UnifiedEmptyState;
