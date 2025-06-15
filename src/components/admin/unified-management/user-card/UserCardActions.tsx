
import { Button } from '@/components/ui/button';
import { Edit, Link, Unlink } from 'lucide-react';

interface UserCardActionsProps {
  user: any;
  hasEmployee: boolean;
  onEdit: (user: any) => void;
  onLink: (user: any) => void;
  onUnlink: (userId: string) => void;
  isLinking: boolean;
  isUnlinking: boolean;
}

const UserCardActions = ({ 
  user, 
  hasEmployee, 
  onEdit, 
  onLink, 
  onUnlink, 
  isLinking, 
  isUnlinking 
}: UserCardActionsProps) => {
  return (
    <div className="flex gap-2 pt-3 border-t">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onEdit(user)}
        className="flex items-center gap-1"
      >
        <Edit className="h-3 w-3" />
        تعديل
      </Button>
      
      {hasEmployee ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUnlink(user.id)}
          disabled={isUnlinking}
          className="flex items-center gap-1 text-orange-600 border-orange-600 hover:bg-orange-50"
        >
          <Unlink className="h-3 w-3" />
          إلغاء الربط
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onLink(user)}
          disabled={isLinking}
          className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-50"
        >
          <Link className="h-3 w-3" />
          ربط موظف
        </Button>
      )}
    </div>
  );
};

export default UserCardActions;
