import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Customer } from '@/types/customer';
import EnhancedCustomerForm from './EnhancedCustomerForm';

interface CustomerEditDialogProps {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const CustomerEditDialog = ({ customer, open, onClose, onSave }: CustomerEditDialogProps) => (
  <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
      <DialogHeader>
        <DialogTitle>تعديل بيانات العميل</DialogTitle>
      </DialogHeader>
      <EnhancedCustomerForm
        initialData={{
          name: customer.name,
          phone: customer.phone || '',
          email: customer.email || '',
          nationality: customer.nationality || '',
          address: customer.address || '',
          passport_number: customer.passport_number || '',
          segment_id: customer.segment_id || '',
        }}
        isEditMode
        customerId={customer.id}
        onCustomerUpdated={onSave}
        onCancel={onClose}
      />
    </DialogContent>
  </Dialog>
);

export default CustomerEditDialog;
