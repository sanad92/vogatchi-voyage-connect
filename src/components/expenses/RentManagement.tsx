
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Home, Plus } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import AddRentContractDialog from './rent/AddRentContractDialog';
import RentContractsGrid from './rent/RentContractsGrid';

const RentManagement = () => {
  const { 
    rentContracts, 
    addRentContract, 
    isAddingContract,
    contractsLoading
  } = useExpenses();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (contractsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              إدارة عقود الإيجار
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عقد إيجار
                </Button>
              </DialogTrigger>
              <AddRentContractDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onAddContract={addRentContract}
                isAddingContract={isAddingContract}
              />
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RentContractsGrid contracts={rentContracts} />
        </CardContent>
      </Card>
    </div>
  );
};

export default RentManagement;
