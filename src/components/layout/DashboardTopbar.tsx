import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Bell, Menu, LogOut, Settings } from 'lucide-react';
import OrgSwitcher from '@/components/org/OrgSwitcher';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

interface DashboardTopbarProps {
  onMenuClick: () => void;
}

const DashboardTopbar = ({ onMenuClick }: DashboardTopbarProps) => {
  const { user, profile, signOut } = useOptimizedAuth();
  const { notifications = [], unreadCount = 0, markAsRead } = useNotifications();
  const recentNotifications = notifications.slice(0, 5);

  return (
    <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border" dir="rtl">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={'\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0646\u0638\u0627\u0645...'}
              className="pr-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card h-10 rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <OrgSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 rtl:-right-0.5 rtl:left-auto min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {Math.min(unreadCount, 99)}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>{'\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                    className="flex flex-col items-start gap-1 cursor-pointer"
                  >
                    <span className="text-sm font-medium">
                      {notification.title || '\u0625\u0634\u0639\u0627\u0631 \u062c\u062f\u064a\u062f'}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message || '\u0628\u062f\u0648\u0646 \u062a\u0641\u0627\u0635\u064a\u0644'}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  {'\u0644\u0627 \u062a\u0648\u062c\u062f \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u062d\u0627\u0644\u064a\u0627\u064b'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground text-sm font-bold">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-right min-w-0">
                  <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {profile?.full_name || '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645'}
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
                  <span>{'\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a'}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 ml-2" />
                <span>{'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardTopbar;
