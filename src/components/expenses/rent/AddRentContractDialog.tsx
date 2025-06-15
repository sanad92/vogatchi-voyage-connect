
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building } from 'lucide-react';
import { useRentContractForm } from './useRentContractForm';
import RentContractFormFields from './RentContractFormFields';

interface AddRentContractDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddContract: (contractData: any) => void;
  isAddingContract: boolean;
}

const AddRentContractDialog = ({ 
  isOpen, 
  onOpenChange, 
  onAddContract, 
  isAddingContract 
}: AddRentContractDialogProps) => {
  const { contractData, resetForm, updateField, isFormValid } = useRentContractForm();

  const handleAddContract = () => {
    onAddContract(contractData);
    onOpenChange(false);
    resetForm();
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
