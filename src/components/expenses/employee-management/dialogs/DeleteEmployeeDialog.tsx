
import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, Link } from 'lucide-react';

interface DeleteEmployeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    full_name: string;
  };
  onConfirm: (employeeId: string, forceDelete?: boolean, reason?: string) => Promise<void>;
  onCheckDeletion: (employeeId: string) => Promise<any>;
  isLoading: boolean;
}

const DeleteEmployeeDialog = ({
  isOpen,
  onOpenChange,
  employee,
  onConfirm,
  onCheckDeletion,
  isLoading
}: DeleteEmployeeDialogProps) => {
  const [reason, setReason] = useState('');
  const [deletionCheck, setDeletionCheck] = useState<any>(null);
  const [isCheckingDeletion, setIsCheckingDeletion] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkEmployeeDeletion();
    }
  }, [isOpen]);

  const checkEmployeeDeletion = async () => {
    setIsCheckingDeletion(true);
    try {
      const result = await onCheckDeletion(employee.id);
      if (result.success) {
        setDeletionCheck(result.data);
      }
    } catch (error) {
      console.error('خطأ في فحص إمكانية الحذف:', error);
    } finally {
      setIsCheckingDeletion(false);
    }
  };

  const handleConfirm = async () => {
    await onConfirm(employee.id, false, reason.trim() || undefined);
    setReason('');
    onOpenChange(false);
  };

  const getDependencyIcon = (type: string) => {
    return type.startsWith('مرتبط بحساب مستخدم')
      ? <Link className="h-4 w-4" />
      : <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            حذف الموظف
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف الموظف{' '}
            <strong className="text-gray-900">{employee.full_name}</strong>؟
            <br />
            <span className="text-red-600 font-medium">الحذف النهائي متاح فقط للسجل غير المرتبط بأي بيانات تاريخية.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isCheckingDeletion ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">جاري فحص الارتباطات...</span>
            </div>
          ) : deletionCheck ? (
            <>
              {/* إحصائيات الارتباطات */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    عدد الارتباطات الموجودة
                  </span>
                  <Badge variant={deletionCheck.dependencies_count > 0 ? "destructive" : "default"}>
                    {deletionCheck.dependencies_count}
                  </Badge>
                </div>
              </div>

              {/* عرض الارتباطات إن وجدت */}
              {deletionCheck.dependencies_count > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">لا يمكن حذف الموظف للأسباب التالية:</p>
                      <ul className="space-y-1">
                        {deletionCheck.blocking_reasons?.map((reason: string, index: number) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            {getDependencyIcon(reason)}
                            {reason}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 pt-2 border-t border-red-200 text-sm">
                        أوقف تفعيل الموظف من قائمة الإجراءات للحفاظ على الحجوزات والرواتب والعمولات التاريخية.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

            </>
          ) : null}

          {/* حقل السبب */}
          {deletionCheck?.can_delete_safely && <div className="space-y-2">
            <Label htmlFor="reason">سبب الحذف (مطلوب)</Label>
            <Textarea
              id="reason"
              placeholder="اذكر سبب حذف الموظف..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          
          {/* زر الحذف العادي */}
          {deletionCheck?.can_delete_safely && (
            <Button
              onClick={handleConfirm}
              disabled={isLoading || !reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'جاري الحذف...' : 'حذف نهائي'}
            </Button>
          )}
          
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteEmployeeDialog;
