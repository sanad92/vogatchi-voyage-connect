
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Edit, 
  Shield, 
  AlertTriangle,
  Crown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SuperAdminActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  itemType: string;
  itemName: string;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  className?: string;
}

const SuperAdminActions = ({
  onEdit,
  onDelete,
  itemType,
  itemName,
  showEditButton = true,
  showDeleteButton = true,
  className = ""
}: SuperAdminActionsProps) => {
  const { isSuperAdmin, canEditAll, canDelete } = useAuth();

  // عرض المكون فقط للسوبر أدمن
  if (!isSuperAdmin()) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* شارة السوبر أدمن */}
      <Badge variant="destructive" className="text-xs">
        <Crown className="h-3 w-3 mr-1" />
        سوبر أدمن
      </Badge>

      {/* زر التعديل */}
      {showEditButton && canEditAll() && onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Edit className="h-4 w-4 mr-1" />
          تعديل
        </Button>
      )}

      {/* زر الحذف مع تأكيد */}
      {showDeleteButton && canDelete() && onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              حذف
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                تأكيد الحذف
              </AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف {itemType}: <strong>{itemName}</strong>؟
                <br />
                <span className="text-red-600 font-medium">
                  هذا الإجراء لا يمكن التراجع عنه!
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                حذف نهائي
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default SuperAdminActions;
