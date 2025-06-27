
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface WhatsAppFixedButtonProps {
  onWhatsAppClick: () => void;
}

const WhatsAppFixedButton = ({ onWhatsAppClick }: WhatsAppFixedButtonProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onWhatsAppClick}
        className="bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full shadow-2xl animate-pulse"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default WhatsAppFixedButton;
