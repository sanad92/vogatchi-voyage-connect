
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import UserInfo from './user-card/UserInfo';
import EmployeeInfo from './user-card/EmployeeInfo';
import UserCardActions from './user-card/UserCardActions';

interface UnifiedUserCardProps {
  user: any;
  onEdit: (user: any) => void;
  onLink: (user: any) => void;
  onUnlink: (userId: string) => void;
  isLinking: boolean;
  isUnlinking: boolean;
}

const UnifiedUserCard = ({ 
  user, 
  onEdit, 
  onLink, 
  onUnlink, 
  isLinking, 
  isUnlinking 
}: UnifiedUserCardProps) => {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'أدمن';
      case 'manager': return 'مدير';
      case 'sales_agent': return 'مندوب مبيعات';
      case 'accountant': return 'محاسب';
      case 'viewer': return 'مشاهد';
      default: return 'بدون دور';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {user.full_name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={user.is_active ? "default" : "secondary"}>
              {user.is_active ? 'نشط' : 'معطل'}
            </Badge>
            <Badge variant="outline">
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <UserInfo user={user} />
        <EmployeeInfo employee={user.employee} />
        <UserCardActions
          user={user}
          hasEmployee={!!user.employee}
          onEdit={onEdit}
          onLink={onLink}
          onUnlink={onUnlink}
          isLinking={isLinking}
          isUnlinking={isUnlinking}
        />
      </CardContent>
    </Card>
  );
};

export default UnifiedUserCard;
