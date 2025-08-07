
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
        className="bg-green-600 hover:bg-green-700 text-white w-14 h-14 lg:w-16 lg:h-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 animate-pulse"
      >
        <MessageSquare className="h-6 w-6 lg:h-7 lg:w-7" />
      </Button>
    </div>
  );
};

export default WhatsAppFixedButton;
