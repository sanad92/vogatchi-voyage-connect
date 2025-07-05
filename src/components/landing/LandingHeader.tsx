
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageSquare } from 'lucide-react';
import { useLandingContent } from '@/hooks/useLandingContent';

interface LandingHeaderProps {
  onWhatsAppClick: () => void;
}

const LandingHeader = ({ onWhatsAppClick }: LandingHeaderProps) => {
  const { getSetting, isLoading } = useLandingContent();
  
  const companyName = getSetting('company_name') || 'Vogatchi Travel';
  const phoneNumber = getSetting('phone_number') || '+20 110 344 2881';
  const email = getSetting('email') || 'ops@vogatchitrips.com';

  if (isLoading) {
    return (
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">{companyName.charAt(0)}</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {companyName}
            </span>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
              <Phone className="h-5 w-5" />
              <span className="font-medium">{phoneNumber}</span>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600">
              <Mail className="h-5 w-5" />
              <span className="font-medium">{email}</span>
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
