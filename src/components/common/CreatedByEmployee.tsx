
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CreatedByEmployeeProps {
  employeeName?: string;
  createdAt?: string;
  variant?: 'default' | 'compact';
}

const CreatedByEmployee = ({ 
  employeeName, 
  createdAt, 
  variant = 'default' 
}: CreatedByEmployeeProps) => {
  if (!employeeName && !createdAt) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Badge variant="outline" className="text-xs">
        <User className="h-3 w-3 mr-1" />
        {employeeName || 'غير محدد'}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <User className="h-4 w-4" />
      <div>
        <span className="font-medium">المنشئ: </span>
        <span>{employeeName || 'غير محدد'}</span>
        {createdAt && (
          <span className="text-gray-500 ml-2">
            في {new Date(createdAt).toLocaleDateString('ar')}
          </span>
        )}
      </div>
    </div>
  );
};

export default CreatedByEmployee;
