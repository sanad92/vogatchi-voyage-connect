import { useState } from 'react';
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
  useWhiteLabel(); // apply org branding at runtime
  useWhatsAppSoundAlerts(); // sound alert on incoming customer messages

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        sidebarCollapsed ? "lg:ms-[68px]" : "lg:ms-64"
      )}>
        <DashboardTopbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
