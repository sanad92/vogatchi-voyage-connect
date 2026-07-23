import { useState, ReactNode } from 'react';
import { Menu, Bell, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import PlatformSidebar from './PlatformSidebar';
import ImpersonationBanner from './ImpersonationBanner';
import { cn } from '@/lib/utils';


interface Props {
  children: ReactNode;
}

const PlatformLayout = ({ children }: Props) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useOptimizedAuth();
  const { platformRole } = usePlatformAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10" dir="rtl">
      <ImpersonationBanner />
      <PlatformSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />


      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        collapsed ? "md:mr-16" : "md:mr-60"
      )}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-14 border-b border-border/60 bg-background/85 backdrop-blur-md flex items-center justify-between px-4 gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <h1 className="text-sm font-semibold">لوحة تحكم المنصة</h1>
              <Badge variant="outline" className="bg-amber-100/60 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border-amber-300 text-[10px] hidden sm:inline-flex">
                {platformRole === 'platform_owner' ? 'Platform Owner' : 'Platform Admin'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 pl-2 border-l border-border/60">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-semibold">
                {profile?.full_name?.charAt(0) ?? 'A'}
              </div>
              <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                {profile?.full_name ?? 'مدير المنصة'}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut} title="تسجيل الخروج">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
