
import { Button } from '@/components/ui/button';
import { Edit, Save, X, RefreshCw } from 'lucide-react';

interface RateActionButtonsProps {
  isEditing: boolean;
  isUpdating: boolean;
  newRate: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onGoogleUpdate: () => void;
}

const RateActionButtons = ({ 
  isEditing, 
  isUpdating, 
  newRate, 
  onEdit, 
  onSave, 
  onCancel, 
  onGoogleUpdate 
}: RateActionButtonsProps) => {
  return (
    <div className="flex gap-2">
      {!isEditing ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isUpdating}
            title="تحرير يدوي - يحدث السعر بنفس التاريخ"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGoogleUpdate}
            disabled={isUpdating}
            title="جلب من الإنترنت - ينشئ سعر جديد لليوم إذا لزم الأمر"
          >
            <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin' : ''}`} />
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isUpdating || !newRate}
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isUpdating}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
};

export default RateActionButtons;
