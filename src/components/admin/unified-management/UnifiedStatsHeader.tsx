
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, UserX } from 'lucide-react';

interface UnifiedStatsHeaderProps {
  totalUsers: number;
  linkedUsers: number;
  unlinkedEmployees: number;
}

const UnifiedStatsHeader = ({ 
  totalUsers, 
  linkedUsers, 
  unlinkedEmployees 
}: UnifiedStatsHeaderProps) => {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">إدارة المستخدمين والموظفين الموحدة</h2>
        <p className="text-gray-600">نظام شامل لإدارة حسابات المستخدمين وبيانات الموظفين</p>
      </div>
      
      <div className="flex gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {totalUsers} مستخدم
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          {linkedUsers} موظف مرتبط
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <UserX className="h-3 w-3" />
          {unlinkedEmployees} موظف غير مرتبط
        </Badge>
      </div>
    </div>
  );
};

export default UnifiedStatsHeader;
