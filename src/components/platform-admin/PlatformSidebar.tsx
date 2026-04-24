import { NavLink, useLocation } from 'react-router-dom';
import { 
  Shield, Building2, CreditCard, BanknoteIcon, Settings, 
  UserCog, ScrollText, Database, Activity, Package, ChevronLeft,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: 'نظرة عامة', href: '/platform', icon: LayoutDashboard },
  { title: 'المؤسسات', href: '/platform/organizations', icon: Building2 },
  { title: 'الاشتراكات', href: '/platform/subscriptions', icon: CreditCard },
  { title: 'خطط الاشتراك', href: '/platform/plans', icon: Package },
  { title: 'التحويلات البنكية', href: '/platform/transfers', icon: BanknoteIcon },
  { title: 'حسابات المنصة', href: '/platform/accounts', icon: UserCog },
  { title: 'سجل التدقيق', href: '/platform/audit', icon: ScrollText },
  { title: 'إعدادات المنصة', href: '/platform/settings', icon: Settings },
  { title: 'قاعدة البيانات', href: '/platform/database', icon: Database },
  { title: 'المراقبة', href: '/platform/monitoring', icon: Activity },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const PlatformSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) => {
  const location = useLocation();
  const isActive = (href: string) => 
    href === '/platform' 
      ? location.pathname === '/platform' 
      : location.pathname === href || location.pathname.startsWith(href + '/');

  const content = (
    <div className="flex flex-col h-full bg-gradient-to-b from-amber-950 via-amber-900 to-orange-950 text-amber-50">
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-amber-800/50",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
          <Shield className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">لوحة المنصة</div>
            <div className="text-[10px] text-amber-300/80 truncate">Platform Admin</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                collapsed && "justify-center px-2",
                active
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md font-medium"
                  : "text-amber-100/80 hover:bg-amber-800/40 hover:text-white"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer: back to org */}
      <div className="border-t border-amber-800/50 p-3 space-y-2">
        <NavLink
          to="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-xs bg-amber-800/40 hover:bg-amber-700/60 transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? 'العودة إلى لوحة المؤسسة' : undefined}
        >
          <ChevronLeft className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>العودة إلى لوحة المؤسسة</span>}
        </NavLink>
        <button
          onClick={onToggle}
          className={cn(
            "hidden md:flex w-full items-center justify-center gap-2 py-2 rounded-lg text-xs text-amber-200/70 hover:bg-amber-800/30 transition"
          )}
        >
          {collapsed ? '→' : '← طي القائمة'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={cn(
        "hidden md:block fixed top-0 right-0 h-screen z-30 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}>
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={onMobileClose} />
          <aside className="relative w-64 h-full mr-auto">{content}</aside>
        </div>
      )}
    </>
  );
};

export default PlatformSidebar;
