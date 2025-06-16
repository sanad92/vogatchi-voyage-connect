
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCustomerData } from "@/hooks/useCustomerData";
import CustomerForm from "./CustomerForm";
import { Customer } from "@/types/customer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";

interface CustomerEditDialogProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated: (customer: Customer) => void;
}

const CustomerEditDialog = ({ customerId, isOpen, onClose, onCustomerUpdated }: CustomerEditDialogProps) => {
  const { customerData, isLoading, refetch, error } = useCustomerData(customerId || '');

  const handleCustomerUpdated = async (customer: Customer) => {
    try {
      console.log('✅ تم تحديث العميل:', customer);
      
      // تحديث البيانات المحلية فوراً
      onCustomerUpdated(customer);
      
      // إعادة تحميل البيانات للتأكد من التحديث
      await refetch();
      
      // إغلاق النافذة
      onClose();
      
      toast.success(`تم تحديث بيانات العميل "${customer.name}" بنجاح`);
    } catch (error) {
      console.error('خطأ في تحديث بيانات العميل:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleRetry = () => {
    refetch();
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
        ) : error ? (
          <div className="text-center p-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <p className="text-red-600 mb-2 font-medium">خطأ في تحميل بيانات العميل</p>
              <p className="text-sm text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
              <Button 
                variant="outline"
                onClick={onClose}
              >
                إغلاق
              </Button>
            </div>
          </div>
        ) : customerData ? (
          <CustomerForm
            onCustomerUpdated={handleCustomerUpdated}
            onCancel={handleCancel}
            initialData={{
              name: customerData.name || '',
              phone: customerData.phone || '',
              email: customerData.email || '',
              nationality: customerData.nationality || '',
              address: customerData.address || '',
              segment_id: customerData.segment_id || '',
            }}
            isEditMode={true}
            customerId={customerId}
          />
        ) : (
          <div className="text-center p-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto" />
            <div>
              <p className="text-gray-600 mb-4">لم يتم العثور على بيانات العميل</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
              <Button 
                variant="outline"
                onClick={onClose}
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerEditDialog;
