import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Menu, LogOut, Settings, Search } from 'lucide-react';
import OrgSwitcher from '@/components/org/OrgSwitcher';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Link } from 'react-router-dom';
import CommandPalette, { useCommandPalette } from '@/components/common/CommandPalette';

interface DashboardTopbarProps {
  onMenuClick: () => void;
}

const DashboardTopbar = ({ onMenuClick }: DashboardTopbarProps) => {
  const { user, profile, signOut } = useOptimizedAuth();
  const [paletteOpen, setPaletteOpen] = useCommandPalette();

  return (
    <header className="sticky top-0 z-20 bg-background/70 backdrop-blur-xl border-b border-border/60" dir="rtl">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6 gap-4">
        {/* Right: Mobile menu + brand hint */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden flex-shrink-0"
            onClick={onMenuClick}
            aria-label="فتح القائمة"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-medium">النظام متصل</span>
          </div>
        </div>

        {/* Center: global search trigger */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden md:flex flex-1 max-w-md items-center gap-2 h-9 px-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 hover:border-border transition-colors text-sm text-muted-foreground focus-ring"
          aria-label="بحث سريع"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-right">ابحث عن أي صفحة أو إجراء…</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            <span>⌘</span><span>K</span>
          </kbd>
        </button>

        {/* Left: Notifications, Org, Profile */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setPaletteOpen(true)}
            aria-label="بحث سريع"
          >
            <Search className="h-5 w-5" />
          </Button>
          <NotificationBell />
          <div className="hidden sm:block h-6 w-px bg-border/60 mx-1" />
          <OrgSwitcher />


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 p-1 pe-2 rounded-full hover:bg-muted/60 transition-colors focus-ring"
                aria-label="قائمة الحساب"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center flex-shrink-0 ring-2 ring-background shadow-sm">
                  <span className="text-primary-foreground text-sm font-bold">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-right min-w-0">
                  <p className="text-sm font-medium text-foreground truncate max-w-[120px] leading-tight">
                    {profile?.full_name || 'المستخدم'}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin-settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  <span>الإعدادات</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 ml-2" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopbar;
