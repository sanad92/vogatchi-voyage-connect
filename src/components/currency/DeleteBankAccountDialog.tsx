
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { BankAccount } from '@/types/currency';

interface DeleteBankAccountDialogProps {
  account: BankAccount;
  onDelete: (accountId: string) => void;
  isDeleting: boolean;
}

const DeleteBankAccountDialog = ({ account, onDelete, isDeleting }: DeleteBankAccountDialogProps) => {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete(account.id);
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد حذف الحساب البنكي</AlertDialogTitle>
          <AlertDialogDescription>
            هل أنت متأكد من حذف الحساب البنكي "{account.account_name}"؟
            <br />
            <br />
            <strong>تحذير:</strong> لا يمكن التراجع عن هذا الإجراء. إذا كان الحساب يحتوي على معاملات مالية، فلن يتم حذفه.
            <br />
            <br />
            <strong>معلومات الحساب:</strong>
            <br />
            • البنك: {account.bank_name}
            <br />
            • رقم الحساب: {account.account_number}
            <br />
            • الرصيد الحالي: {account.current_balance} {account.currency}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'جاري الحذف...' : 'حذف الحساب'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBankAccountDialog;
