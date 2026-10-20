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
    <div className="min-h-screen bg-background" dir="rtl">
      <ImpersonationBanner />
      <PlatformSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        collapsed ? "md:mr-16" : "md:mr-64"
      )}>
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              <h1 className="text-sm font-semibold text-foreground">لوحة تحكم المنصة</h1>
              <Badge variant="outline" className="border-accent/40 text-accent text-[10px] hidden sm:inline-flex">
                {platformRole === 'platform_owner' ? 'مالك المنصة' : 'مدير المنصة'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="الإشعارات">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 ps-2 border-s border-border">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                {profile?.full_name?.charAt(0) ?? 'A'}
              </div>
              <span className="hidden sm:inline text-sm font-medium truncate max-w-[140px]">
                {profile?.full_name ?? 'مدير المنصة'}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut} title="تسجيل الخروج" aria-label="تسجيل الخروج">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
