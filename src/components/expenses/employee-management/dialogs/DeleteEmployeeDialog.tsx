
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
import { Trash2, AlertTriangle, Shield, Link } from 'lucide-react';

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
  const [showForceDelete, setShowForceDelete] = useState(false);
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

  const handleConfirm = async (forceDelete = false) => {
    await onConfirm(employee.id, forceDelete, reason.trim() || undefined);
    setReason('');
    setShowForceDelete(false);
    onOpenChange(false);
  };

  const getDependencyIcon = (type: string) => {
    switch (type) {
      case 'مرتبط بحساب مستخدم':
        return <Link className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
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
            <span className="text-red-600 font-medium">
              هذا الإجراء لا يمكن التراجع عنه!
            </span>
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
                      <div className="mt-3 pt-2 border-t border-red-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowForceDelete(!showForceDelete)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          {showForceDelete ? 'إخفاء' : 'إظهار'} خيار الحذف الإجباري
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* خيار الحذف الإجباري */}
              {showForceDelete && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium text-orange-800 mb-2">الحذف الإجباري</p>
                    <p className="text-sm text-orange-700">
                      سيؤدي الحذف الإجباري إلى إلغاء جميع الارتباطات وحذف الموظف نهائياً.
                      استخدم هذا الخيار بحذر شديد.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : null}

          {/* حقل السبب */}
          <div className="space-y-2">
            <Label htmlFor="reason">سبب الحذف (مطلوب)</Label>
            <Textarea
              id="reason"
              placeholder="اذكر سبب حذف الموظف..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
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
          
          {/* زر الحذف العادي */}
          {deletionCheck?.can_delete_safely && (
            <Button
              onClick={() => handleConfirm(false)}
              disabled={isLoading || !reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'جاري الحذف...' : 'حذف نهائي'}
            </Button>
          )}
          
          {/* زر الحذف الإجباري */}
          {showForceDelete && (
            <Button
              onClick={() => handleConfirm(true)}
              disabled={isLoading || !reason.trim()}
              className="bg-red-800 hover:bg-red-900"
            >
              {isLoading ? 'جاري الحذف...' : 'حذف إجباري'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteEmployeeDialog;
