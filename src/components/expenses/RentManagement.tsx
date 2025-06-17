
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Plus, CreditCard, Bell } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import AddRentContractDialog from './rent/AddRentContractDialog';
import RentContractsGrid from './rent/RentContractsGrid';
import ImprovedRentPaymentManagement from './rent/ImprovedRentPaymentManagement';
import RentContractAlerts from './rent/RentContractAlerts';

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
              إدارة عقود الإيجار والمدفوعات المحسّنة
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
          <Tabs defaultValue="contracts" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contracts" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                العقود
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                المدفوعات المحسّنة
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                التنبيهات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contracts" className="space-y-4">
              <RentContractsGrid contracts={rentContracts} />
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <ImprovedRentPaymentManagement />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <RentContractAlerts />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentManagement;
