
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building } from 'lucide-react';
import { useRentContractForm } from './useRentContractForm';
import RentContractFormFields from './RentContractFormFields';
import { toast } from 'sonner';

interface AddRentContractDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddContract: (contractData: any) => void | Promise<unknown>;
  isAddingContract: boolean;
}

const AddRentContractDialog = ({ 
  isOpen, 
  onOpenChange, 
  onAddContract, 
  isAddingContract 
}: AddRentContractDialogProps) => {
  const { contractData, resetForm, updateField, isFormValid, getValidationErrors } = useRentContractForm();

  const handleAddContract = async () => {
    const errors = getValidationErrors();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    try {
      await onAddContract(contractData);
      onOpenChange(false);
      resetForm();
    } catch {
      // mutation hook already shows the detailed error message
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة عقد إيجار جديد</DialogTitle>
        </DialogHeader>
        
        <RentContractFormFields 
          contractData={contractData}
          onUpdateField={updateField}
        />
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={handleAddContract}
            disabled={!isFormValid() || isAddingContract}
          >
            <Building className="h-4 w-4 mr-2" />
            {isAddingContract ? 'جاري الإضافة...' : 'إضافة العقد'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRentContractDialog;
