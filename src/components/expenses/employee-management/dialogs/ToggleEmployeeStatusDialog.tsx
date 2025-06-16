
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserCheck, UserX, AlertTriangle } from 'lucide-react';

interface ToggleEmployeeStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    full_name: string;
    is_active: boolean;
  };
  onConfirm: (employeeId: string, isActive: boolean, reason?: string) => Promise<void>;
  isLoading: boolean;
}

const ToggleEmployeeStatusDialog = ({
  isOpen,
  onOpenChange,
  employee,
  onConfirm,
  isLoading
}: ToggleEmployeeStatusDialogProps) => {
  const [reason, setReason] = useState('');
  const newStatus = !employee.is_active;

  const handleConfirm = async () => {
    await onConfirm(employee.id, newStatus, reason.trim() || undefined);
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {newStatus ? (
              <UserCheck className="h-5 w-5 text-green-600" />
            ) : (
              <UserX className="h-5 w-5 text-red-600" />
            )}
            {newStatus ? 'تفعيل الموظف' : 'إيقاف الموظف'}
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من {newStatus ? 'تفعيل' : 'إيقاف'} الموظف{' '}
            <strong className="text-gray-900">{employee.full_name}</strong>؟
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!newStatus && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">تنبيه</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                إيقاف الموظف سيمنعه من تسجيل الدخول وظهوره في قوائم الموظفين النشطين
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              السبب {newStatus ? '(اختياري)' : '(مطلوب)'}
            </Label>
            <Textarea
              id="reason"
              placeholder={`اذكر سبب ${newStatus ? 'التفعيل' : 'الإيقاف'}...`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required={!newStatus}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (!newStatus && !reason.trim())}
            className={
              newStatus
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }
          >
            {isLoading ? 'جاري المعالجة...' : newStatus ? 'تفعيل' : 'إيقاف'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ToggleEmployeeStatusDialog;
