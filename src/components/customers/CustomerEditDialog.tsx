
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCustomerData } from "@/hooks/useCustomerData";
import CustomerForm from "./CustomerForm";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  segment_id?: string;
}

interface CustomerEditDialogProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated: (customer: Customer) => void;
}

const CustomerEditDialog = ({ customerId, isOpen, onClose, onCustomerUpdated }: CustomerEditDialogProps) => {
  const { customerData, isLoading } = useCustomerData(customerId || '');

  const handleCustomerUpdated = (customer: Customer) => {
    onCustomerUpdated(customer);
    onClose();
  };

  if (!customerId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تعديل معلومات العميل</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mr-2 text-gray-600">جاري تحميل بيانات العميل...</p>
          </div>
        ) : customerData ? (
          <CustomerForm
            onCustomerUpdated={handleCustomerUpdated}
            onCancel={onClose}
            initialData={{
              name: customerData.name,
              phone: customerData.phone,
              email: customerData.email || '',
              nationality: customerData.nationality || '',
              address: customerData.address || '',
              segment_id: customerData.segment_id || '',
            }}
            isEditMode={true}
            customerId={customerId}
          />
        ) : (
          <div className="text-center p-4 text-red-600">
            خطأ في تحميل بيانات العميل
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerEditDialog;
