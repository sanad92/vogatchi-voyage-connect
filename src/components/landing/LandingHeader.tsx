
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
    <header className="bg-background/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/4e5be0db-7fdc-425e-9eed-4de0386c3eea.png"
              alt="Vogatchi logo"
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg object-contain shadow-md"
            />
            <span className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {companyName}
            </span>
          </div>

          {/* Contact Info & Actions */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">{phoneNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">{email}</span>
            </div>
            <Button
              onClick={onWhatsAppClick}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              واتساب
            </Button>
          </div>

          {/* Mobile WhatsApp Button */}
          <div className="md:hidden">
            <Button
              onClick={onWhatsAppClick}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
