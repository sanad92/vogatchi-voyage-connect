import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Hotel,
  LayoutDashboard,
  MessageSquare,
  Plane,
  Plus,
  Receipt,
  Settings,
  Shield,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  isPlatformGroup?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
    icon: LayoutDashboard,
    items: [
      { title: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645', href: '/dashboard', icon: LayoutDashboard },
      { title: '\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a', href: '/bookings-calendar', icon: Calendar },
      { title: '\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645\u064a\u0629', href: '/daily-operations', icon: Briefcase },
    ],
  },
  {
    label: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a',
    icon: Hotel,
    items: [
      { title: '\u0643\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a', href: '/bookings', icon: FileText },
      { title: '\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0641\u0646\u0627\u062f\u0642', href: '/hotel-bookings', icon: Hotel },
      { title: '\u062d\u062c\u0648\u0632\u0627\u062a \u0627\u0644\u0637\u064a\u0631\u0627\u0646', href: '/flight-bookings', icon: Plane },
      { title: '\u062a\u0623\u062c\u064a\u0631 \u0627\u0644\u0633\u064a\u0627\u0631\u0627\u062a', href: '/car-rentals', icon: Truck },
      { title: '\u0627\u0644\u0646\u0642\u0644', href: '/transport-bookings', icon: Truck },
    ],
  },
  {
    label: '\u0627\u0644\u0639\u0645\u0644\u0627\u0621',
    icon: Users,
    items: [
      { title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621', href: '/customers', icon: Users },
      { title: '\u062e\u062f\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621', href: '/customer-service', icon: MessageSquare },
      { title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a CRM', href: '/crm', icon: UserCheck },
    ],
  },
  {
    label: '\u0627\u0644\u0645\u0627\u0644\u064a\u0629',
    icon: Calculator,
    items: [
      { title: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631', href: '/invoices', icon: Receipt },
      { title: '\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062f\u0641\u0639', href: '/payment-orders', icon: CreditCard },
      { title: '\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0628\u0646\u0643\u064a\u0629', href: '/bank-accounts', icon: Building2 },
      { title: '\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a', href: '/expense-management', icon: Calculator },
    ],
  },
  {
    label: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631',
    icon: BarChart3,
    items: [
      { title: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631', href: '/reports', icon: FileText },
      { title: '\u0627\u0644\u0623\u0631\u0628\u0627\u062d \u0648\u0627\u0644\u062e\u0633\u0627\u0626\u0631', href: '/profit-loss-reports', icon: TrendingUp },
      { title: '\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a CRM', href: '/crm-dashboard', icon: BarChart3 },
    ],
  },
  {
    label: '\u0627\u0644\u0625\u062f\u0627\u0631\u0629',
    icon: Settings,
    items: [
      { title: '\u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646', href: '/suppliers', icon: Truck },
      { title: '\u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646', href: '/employees-enhanced', icon: Users },
      { title: '\u0627\u0644\u0641\u0631\u064a\u0642', href: '/team', icon: Users },
      { title: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a', href: '/admin-settings', icon: Settings },
    ],
  },
];

const platformAdminGroup: NavGroup = {
  label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u0635\u0629',
  icon: Shield,
  isPlatformGroup: true,
  items: [
    { title: '\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629', href: '/platform-admin', icon: Shield },
    { title: '\u0627\u0644\u0645\u0624\u0633\u0633\u0627\u062a', href: '/platform-admin/organizations', icon: Building2 },
    { title: '\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a', href: '/platform-admin/subscriptions', icon: CreditCard },
  ],
};

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const DashboardSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const { user, profile } = useOptimizedAuth();
  const { isPlatformAdmin } = usePlatformAdmin();

  const allGroups = useMemo(
    () => (isPlatformAdmin ? [...navGroups, platformAdminGroup] : navGroups),
    [isPlatformAdmin]
  );

  const isActive = (href: string) =>
    location.pathname === href ||
    (href !== '/dashboard' && href !== '/bookings' && location.pathname.startsWith(`${href}/`));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};

    allGroups.forEach((group) => {
      initial[group.label] = group.items.some((item) => isActive(item.href));
    });

    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const sidebarContent = (
    <div className="relative z-10 flex h-full flex-col">
      <div
        className={cn(
          'border-b border-white/10 px-4 py-5',
          collapsed ? 'flex justify-center' : 'space-y-4'
        )}
      >
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300/80 via-sky-400/80 to-blue-500/80 text-slate-950 shadow-[0_12px_30px_-12px_rgba(56,189,248,0.8)]">
            <span className="text-lg font-black">V</span>
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-white">Vogatchi Connect</p>
              <p className="truncate text-[11px] text-cyan-100/80">Travel Operations Hub</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-blue-500/25 ring-1 ring-cyan-200/20">
                  <span className="text-sm font-bold text-white">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {profile?.full_name || '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645'}
                  </p>
                  <p className="truncate text-xs text-white/60">{user?.email}</p>
                </div>
              </div>
            </div>

            <Link
              to="/new-hotel-booking"
              onClick={onMobileClose}
              className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400/90 to-sky-500/90 px-3 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:from-cyan-300 hover:to-sky-400"
            >
              <Plus className="h-4 w-4" />
              {'\u062d\u062c\u0632 \u062c\u062f\u064a\u062f'}
            </Link>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3 scrollbar-thin">
        <TooltipProvider delayDuration={0}>
          {allGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupHasActiveItem = group.items.some((item) => isActive(item.href));

            return (
              <div
                key={group.label}
                className={cn(
                  'rounded-2xl border border-transparent p-1 transition-colors',
                  group.isPlatformGroup && 'border-amber-300/20 bg-amber-300/5'
                )}
              >
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition-colors',
                      group.isPlatformGroup
                        ? 'text-amber-200 hover:bg-amber-200/10'
                        : groupHasActiveItem
                          ? 'bg-white/10 text-white'
                          : 'text-white/65 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <GroupIcon className="h-3.5 w-3.5" />
                      {group.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        !openGroups[group.label] && '-rotate-90 rtl:rotate-90'
                      )}
                    />
                  </button>
                ) : (
                  <div
                    className={cn(
                      'mx-2 h-px',
                      group.isPlatformGroup ? 'bg-amber-300/40' : 'bg-white/10'
                    )}
                  />
                )}

                {(collapsed || openGroups[group.label]) && (
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      const linkContent = (
                        <Link
                          to={item.href}
                          onClick={onMobileClose}
                          className={cn(
                            'group/item relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm transition-all duration-200',
                            collapsed && 'justify-center px-2',
                            active
                              ? 'bg-gradient-to-r from-cyan-300/20 to-sky-400/20 text-white shadow-[inset_0_0_0_1px_rgba(103,232,249,0.35)]'
                              : 'text-white/75 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-8 w-8 place-items-center rounded-lg transition-colors',
                              active
                                ? 'bg-cyan-300/25 text-cyan-100'
                                : 'text-white/70 group-hover/item:bg-white/10 group-hover/item:text-white'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          {!collapsed && <span className="truncate">{item.title}</span>}

                          {active && (
                            <span className="absolute right-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-cyan-300" />
                          )}
                        </Link>
                      );

                      if (collapsed) {
                        return (
                          <Tooltip key={item.href}>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="left" className="font-medium">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return <div key={item.href}>{linkContent}</div>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className="hidden border-t border-white/10 p-3 lg:block">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          ) : (
            <>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              <span>{'\u0637\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />
        </div>
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-80 overflow-hidden border-l border-white/10 shadow-2xl transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_25%_0%,rgba(34,211,238,0.32)_0%,transparent_55%),radial-gradient(700px_circle_at_85%_20%,rgba(59,130,246,0.22)_0%,transparent_62%),linear-gradient(180deg,#0a1528_0%,#081224_100%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
        <button
          onClick={onMobileClose}
          className="absolute left-4 top-4 z-20 rounded-lg bg-white/5 p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:right-0 lg:z-30 lg:flex lg:flex-col lg:overflow-hidden lg:border-l lg:border-white/10 lg:transition-all lg:duration-300',
          collapsed ? 'lg:w-[76px]' : 'lg:w-72'
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_25%_0%,rgba(34,211,238,0.28)_0%,transparent_55%),radial-gradient(700px_circle_at_85%_20%,rgba(59,130,246,0.18)_0%,transparent_62%),linear-gradient(180deg,#0a1528_0%,#081224_100%)]" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px]" />
        {sidebarContent}
      </aside>
    </>
  );
};

export default DashboardSidebar;
