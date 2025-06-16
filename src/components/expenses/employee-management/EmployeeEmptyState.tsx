
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

interface EmployeeEmptyStateProps {
  searchTerm: string;
  onAddEmployee: () => void;
}

const EmployeeEmptyState = ({ searchTerm, onAddEmployee }: EmployeeEmptyStateProps) => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchTerm ? 'لا توجد نتائج' : 'لا توجد موظفين'}
        </h3>
        <p className="text-gray-600 mb-4">
          {searchTerm 
            ? 'لم يتم العثور على موظفين يطابقون البحث الحالي'
            : 'ابدأ بإضافة موظف جديد لإدارة فريق العمل'
          }
        </p>
        {!searchTerm && (
          <Button onClick={onAddEmployee}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة موظف جديد
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeEmptyState;
