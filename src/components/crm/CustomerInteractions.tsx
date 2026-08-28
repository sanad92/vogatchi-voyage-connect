
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCustomerService } from '@/hooks/useCustomerService';
import InteractionStats from './interactions/InteractionStats';
import InteractionsList from './interactions/InteractionsList';
import InteractionForm, { type CommunicationInput } from './interactions/InteractionForm';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';

const CustomerInteractions = () => {
  const { communications, addCommunication } = useCustomerService();
  const { canEditCRM } = useSupabasePermissions();
  const [isNewInteractionOpen, setIsNewInteractionOpen] = useState(false);

  const handleNewInteraction = async (data: CommunicationInput) => {
    await addCommunication(data);
    setIsNewInteractionOpen(false);
  };

  return (
    <div className="space-y-6">
      <InteractionStats interactions={communications} />
      
      <InteractionsList 
        interactions={communications}
        onNewInteraction={canEditCRM() ? () => setIsNewInteractionOpen(true) : undefined}
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
