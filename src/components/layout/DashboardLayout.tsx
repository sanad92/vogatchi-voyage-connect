import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/sheet';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import { cn } from '@/lib/utils';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { useWhatsAppSoundAlerts } from '@/hooks/useWhatsAppSoundAlerts';
import { useLanguage } from '@/contexts/LanguageContext';


interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { dir } = useLanguage();
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  useWhiteLabel(); // apply org branding at runtime
  useWhatsAppSoundAlerts(); // sound alert on incoming customer messages

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <div className="min-h-screen bg-background" dir={dir}>
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className={cn(
          "transition-all duration-300 min-h-screen flex flex-col",
          sidebarCollapsed ? "lg:ms-[68px]" : "lg:ms-64"
        )}>
          <DashboardTopbar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </Sheet>
  );
};

export default DashboardLayout;
