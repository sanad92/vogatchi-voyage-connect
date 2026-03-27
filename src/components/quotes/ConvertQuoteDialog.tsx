import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  itemCount: number;
}

export default function ConvertQuoteDialog({ open, onOpenChange, onConfirm, isLoading, itemCount }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تحويل عرض السعر إلى حجز</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم إنشاء {itemCount} حجز/حجوزات وفاتورة مجمعة تلقائياً.
            <br />
            هل أنت متأكد من المتابعة؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'جاري التحويل...' : 'تأكيد التحويل'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
