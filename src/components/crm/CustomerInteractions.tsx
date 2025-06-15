
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomerService } from '@/hooks/useCustomerService';
import InteractionStats from './interactions/InteractionStats';
import InteractionsList from './interactions/InteractionsList';
import InteractionForm from './interactions/InteractionForm';

const CustomerInteractions = () => {
  const { todayTasks, addCommunication } = useCustomerService();
  const [isNewInteractionOpen, setIsNewInteractionOpen] = useState(false);

  // استخراج التفاعلات من مهام المتابعة
  const interactions = todayTasks?.flatMap(task => 
    task.communications?.map(comm => ({
      ...comm,
      customer_name: task.customer_name,
      booking_reference: task.booking_reference
    })) || []
  ) || [];

  const handleNewInteraction = (data: any) => {
    addCommunication(data);
    setIsNewInteractionOpen(false);
  };

  return (
    <div className="space-y-6">
      <InteractionStats interactions={interactions} />
      
      <InteractionsList 
        interactions={interactions}
        onNewInteraction={() => setIsNewInteractionOpen(true)}
      />

      <Dialog open={isNewInteractionOpen} onOpenChange={setIsNewInteractionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تسجيل تفاعل جديد</DialogTitle>
          </DialogHeader>
          <InteractionForm
            onSubmit={handleNewInteraction}
            onCancel={() => setIsNewInteractionOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerInteractions;
