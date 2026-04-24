
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLandingContent } from '@/hooks/useLandingContent';
import VogantraLogo from '@/components/brand/VogantraLogo';

interface LandingHeaderProps {
  onWhatsAppClick: () => void;
}

const LandingHeader = ({ onWhatsAppClick }: LandingHeaderProps) => {
  const { getSetting } = useLandingContent();
  const phoneNumber = getSetting('phone_number') || '01103442881';
  const email = getSetting('email') || 'hello@vogantra.com';

  return (
    <header className="bg-background/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-border/40">
      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 xl:px-10 2xl:px-12">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center">
            <VogantraLogo size="md" showTagline />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">{phoneNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">{email}</span>
            </div>
            <Link to="/login">
              <Button variant="ghost" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg transition-all">
                ابدأ مجاناً
              </Button>
            </Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">دخول</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                ابدأ
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
