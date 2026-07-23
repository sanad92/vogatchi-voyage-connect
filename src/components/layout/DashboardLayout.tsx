import { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import { cn } from '@/lib/utils';
import { useOrgImpersonation } from '@/hooks/useOrgImpersonation';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldAlert } from 'lucide-react';
import ImpersonationBanner from '@/components/platform-admin/ImpersonationBanner';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';


interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isImpersonating, impersonatingOrgName, stop } = useOrgImpersonation();
  useWhiteLabel(); // apply org branding at runtime

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <ImpersonationBanner />
      {isImpersonating && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">

          <div className="px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              <span>أنت تتصفح الآن كمؤسسة:</span>
              <span className="font-bold">{impersonatingOrgName}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => stop()}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white h-7"
            >
              <LogOut className="h-3.5 w-3.5 ml-1" />
              العودة للوحة المنصة
            </Button>
          </div>
        </div>
      )}

      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        sidebarCollapsed ? "lg:mr-[68px]" : "lg:mr-64"
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
