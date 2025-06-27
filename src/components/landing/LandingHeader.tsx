
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageSquare } from 'lucide-react';

interface LandingHeaderProps {
  onWhatsAppClick: () => void;
}

const LandingHeader = ({ onWhatsAppClick }: LandingHeaderProps) => {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Vogatchi Travel
            </span>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
              <Phone className="h-5 w-5" />
              <span className="font-medium">+20 110 344 2881</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
              <Mail className="h-5 w-5" />
              <span className="font-medium">ops@vogatchitrips.com</span>
            </div>
            <Button
              onClick={onWhatsAppClick}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              واتساب
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
