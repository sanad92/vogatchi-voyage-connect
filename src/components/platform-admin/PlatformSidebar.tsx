import { NavLink, useLocation } from 'react-router-dom';
import {
  Shield, Building2, CreditCard, BanknoteIcon, Settings,
  UserCog, ScrollText, Database, Activity, Package, ChevronRight,
  LayoutDashboard, TrendingUp, Globe, Zap, Workflow, PanelRightClose, PanelRightOpen, LifeBuoy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'نظرة عامة',
    items: [
      { title: 'لوحة المؤشرات', href: '/platform', icon: LayoutDashboard },
      { title: 'التحليلات', href: '/platform/analytics', icon: TrendingUp },
    ],
  },
  {
    label: 'الشركات والاشتراكات',
    items: [
      { title: 'الشركات', href: '/platform/organizations', icon: Building2 },
      { title: 'الاشتراكات', href: '/platform/subscriptions', icon: CreditCard },
      { title: 'خطط الاشتراك', href: '/platform/plans', icon: Package },
      { title: 'التحويلات البنكية', href: '/platform/transfers', icon: BanknoteIcon },
      { title: 'تذاكر الدعم', href: '/platform/support', icon: LifeBuoy },
    ],
  },
  {
    label: 'التشغيل والتقنية',
    items: [
      { title: 'قاعدة البيانات', href: '/platform/database', icon: Database },
      { title: 'البيانات العالمية', href: '/platform/global-data', icon: Globe },
      { title: 'قواعد سير العمل', href: '/platform/workflow-rules', icon: Workflow, ownerOnly: true },
      { title: 'ناقل الأحداث', href: '/platform/event-bus', icon: Zap, ownerOnly: true },
      { title: 'المراقبة', href: '/platform/monitoring', icon: Activity },
    ],
  },
  {
    label: 'الأمان والإعدادات',
    items: [
      { title: 'حسابات المنصة', href: '/platform/accounts', icon: UserCog },
      { title: 'سجل التدقيق', href: '/platform/audit', icon: ScrollText },
      { title: 'إعدادات المنصة', href: '/platform/settings', icon: Settings },
    ],
  },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const PlatformSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) => {
  const location = useLocation();
  const { isPlatformOwner } = usePlatformAdmin();
  const isActive = (href: string) =>
    href === '/platform'
      ? location.pathname === '/platform'
      : location.pathname === href || location.pathname.startsWith(href + '/');

  const renderContent = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-s border-sidebar-border">
      <div className={cn(
        'flex items-center gap-3 px-4 h-16 border-b border-sidebar-border',
        isCollapsed && 'justify-center px-2'
      )}>
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary/15 border border-sidebar-primary/40 flex items-center justify-center flex-shrink-0">
          <Shield className="h-4 w-4 text-sidebar-primary" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">SafarERP</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">إدارة المنصة</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {NAV_GROUPS.map(group => {
          const items = group.items.filter(i => !i.ownerOnly || isPlatformOwner);
          if (!items.length) return null;
          return (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-primary/90">
                  {group.label}
                </div>
              )}
              {items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onMobileClose}
                    title={isCollapsed ? item.title : undefined}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isCollapsed && 'justify-center px-2',
                      active
                        ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-sidebar-primary" />}
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <NavLink
          to="https://safarerp.com/dashboard"
          title={isCollapsed ? 'العودة إلى لوحة الشركة' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>العودة إلى لوحة الشركة</span>}
        </NavLink>
        <button
          onClick={onToggle}
          className="hidden md:flex w-full items-center justify-center gap-2 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
          aria-label={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {isCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <><PanelRightClose className="h-4 w-4" /><span>طي القائمة</span></>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn(
        'hidden md:block fixed top-0 right-0 h-screen z-30 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {renderContent(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/50" onClick={onMobileClose} />
          <aside className="relative w-72 h-full ms-auto">{renderContent(false)}</aside>
        </div>
      )}
    </>
  );
};

export default PlatformSidebar;
