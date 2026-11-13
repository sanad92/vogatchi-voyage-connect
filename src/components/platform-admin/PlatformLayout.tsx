import { useState, ReactNode } from 'react';
import { Menu, Bell, LogOut, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { dir } = useLanguage();
  const location = useLocation();
  const { profile, signOut } = useOptimizedAuth();
  const { platformRole } = usePlatformAdmin();

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <ImpersonationBanner />
      <PlatformSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        collapsed ? "md:ms-16" : "md:ms-64"
      )}>
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/90 backdrop-blur-md flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">لوحة تحكم المنصة</p>
              <Badge variant="outline" className="border-border text-muted-foreground text-[10px] hidden sm:inline-flex">
                {platformRole === 'platform_owner' ? 'مالك المنصة' : 'مدير المنصة'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {location.pathname !== '/platform' && (
              <Button asChild variant="ghost" size="icon">
                <Link to="/platform#platform-follow-up" aria-label="يحتاج إلى متابعة" title="يحتاج إلى متابعة">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
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
