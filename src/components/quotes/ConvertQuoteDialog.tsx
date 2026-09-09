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
    <AlertDialog open={open} onOpenChange={value => { if (!isLoading) onOpenChange(value); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تحويل عرض السعر إلى حجز</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم إنشاء حجز واحد يضم {itemCount} خدمة، وفاتورة واحدة للعميل ومستحقات منفصلة للموردين.
            <br />
            هل أنت متأكد من المتابعة؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={event => { event.preventDefault(); if (!isLoading) onConfirm(); }} disabled={isLoading}>
            {isLoading ? 'جاري التحويل...' : 'تأكيد التحويل'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
