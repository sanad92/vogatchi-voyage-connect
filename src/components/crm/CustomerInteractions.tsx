
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomerService } from '@/hooks/useCustomerService';
import InteractionStats from './interactions/InteractionStats';
import InteractionsList from './interactions/InteractionsList';
import InteractionForm from './interactions/InteractionForm';

const CustomerInteractions = () => {
  const { todayTasks, addCommunication } = useCustomerService();
  const [isNewInteractionOpen, setIsNewInteractionOpen] = useState(false);

  // Since communications are not directly available in follow-ups,
  // we'll create a placeholder structure for interactions
  const interactions = todayTasks?.map(task => ({
    id: task.id,
    customer_name: task.customer?.name || 'غير محدد',
    booking_reference: task.booking_id || 'غير محدد',
    communication_type: 'follow_up',
    status: task.status,
    content: task.notes || 'متابعة مجدولة',
    created_at: task.created_at,
    direction: 'outbound'
  })) || [];

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
