import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Hotel, Plane, Car, Truck, Receipt,
  FileText, Building2, Calculator, TrendingUp, Calendar,
  MessageSquare, Settings, ChevronDown, ChevronLeft, ChevronRight,
  CreditCard, Briefcase, BarChart3, UserCheck, X, Shield, FileCheck, Zap,
  ClipboardList, BanknoteIcon, AlertTriangle, Star,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

const FAVORITES_KEY = 'vogatchi:sidebar:favorites:v1';


interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredPermission?: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  requiredPermission?: string;
}

const navGroups: NavGroup[] = [
  {
    label: 'الرئيسية',
    icon: LayoutDashboard,
    items: [
      { title: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
      { title: 'تقويم الحجوزات', href: '/bookings-calendar', icon: Calendar, requiredPermission: 'bookings_view' },
      { title: 'العمليات اليومية', href: '/daily-operations', icon: Briefcase, requiredPermission: 'bookings_view' },
      { title: 'جودة البيانات', href: '/data-quality', icon: AlertTriangle },
    ],
  },
  {
    label: 'الحجوزات',
    icon: ClipboardList,
    requiredPermission: 'bookings_view',
    items: [
      { title: 'كل الحجوزات', href: '/bookings', icon: ClipboardList },
      { title: 'عروض الأسعار', href: '/quotes', icon: FileCheck, requiredPermission: 'quotes_view' },
      { title: 'تقويم الحجوزات', href: '/bookings-calendar', icon: Calendar },
      // العروض المتخصصة (قديم - تبقى متاحة عبر روابط مباشرة لكن الواجهة الموحدة هي الأساس)
      { title: 'فنادق (عرض مفصّل)', href: '/hotel-bookings', icon: Hotel },
      { title: 'طيران (عرض مفصّل)', href: '/flight-bookings', icon: Plane },
      { title: 'سيارات (عرض مفصّل)', href: '/car-rentals', icon: Car },
      { title: 'نقل (عرض مفصّل)', href: '/transport-bookings', icon: Truck },
    ],
  },
  {
    label: 'العملاء',
    icon: Users,
    requiredPermission: 'customers_view',
    items: [
      { title: 'إدارة العملاء', href: '/customers', icon: Users },
      { title: 'خدمة العملاء', href: '/customer-service', icon: MessageSquare, requiredPermission: 'customer_service_view' },
      { title: 'CRM', href: '/crm', icon: UserCheck, requiredPermission: 'crm_view' },
    ],
  },
  {
    label: 'المالية',
    icon: Receipt,
    requiredPermission: 'invoices_view',
    items: [
      { title: 'الفواتير', href: '/invoices', icon: Receipt },
      { title: 'المستندات', href: '/documents', icon: FileText, requiredPermission: 'documents_view' },
      // { title: 'أوامر الدفع', href: '/payment-orders', icon: CreditCard, requiredPermission: 'financial_view' }, // Deferred: payment_orders table not implemented yet
      { title: 'الحسابات البنكية', href: '/bank-accounts', icon: Building2, requiredPermission: 'financial_view' },
      { title: 'المصروفات', href: '/expense-management', icon: Calculator, requiredPermission: 'expenses_view' },
    ],
  },
  {
    label: 'المحاسبة',
    icon: BarChart3,
    requiredPermission: 'financial_view',
    items: [
      { title: 'لوحة CFO', href: '/cfo-dashboard', icon: TrendingUp },
      { title: 'شجرة الحسابات', href: '/chart-of-accounts', icon: FileText },
      { title: 'القيود المحاسبية', href: '/journal-entries', icon: Receipt },
      { title: 'التقارير المحاسبية', href: '/accounting-reports', icon: TrendingUp },
      { title: 'مراكز التكلفة', href: '/cost-centers', icon: BarChart3 },
      { title: 'الفترات المحاسبية', href: '/accounting-periods', icon: FileText },
    ],
  },
  {
    label: 'التقارير',
    icon: BarChart3,
    requiredPermission: 'reports_view',
    items: [
      { title: 'التقارير التشغيلية', href: '/reports', icon: FileText },
      { title: 'تحليل الأرباح', href: '/profit-analytics', icon: TrendingUp, requiredPermission: 'reports_advanced' },
      { title: 'الإحصائيات', href: '/crm-dashboard', icon: BarChart3, requiredPermission: 'crm_view' },
      { title: 'مركز التصدير', href: '/export-center', icon: FileText },
    ],
  },
  {
    label: 'الإدارة',
    icon: Settings,
    items: [
      { title: 'الموردين', href: '/suppliers', icon: Truck, requiredPermission: 'suppliers_view' },
      { title: 'الأسعار الموسمية', href: '/supplier-rates', icon: Truck, requiredPermission: 'suppliers_view' },
      { title: 'بلوكات المخزون', href: '/supplier-allotments', icon: Truck, requiredPermission: 'suppliers_view' },
      { title: 'فريق العمل', href: '/team', icon: Users },
      { title: 'الأتمتة', href: '/automation', icon: Zap, requiredPermission: 'automation_view' },
      { title: 'سجل التدقيق', href: '/audit-log', icon: Shield, requiredPermission: 'audit_view' },
      { title: 'الإعدادات', href: '/admin-settings', icon: Settings, requiredPermission: 'admin_settings' },
    ],
  },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const DashboardSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }: DashboardSidebarProps) => {
  const location = useLocation();
  const { user, profile, isSuperAdmin } = useOptimizedAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { hasPermission } = useSupabasePermissions();

  // Platform admin section removed from org sidebar — they have a dedicated /platform layout
  const allGroups = useMemo(() => navGroups, []);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    allGroups.forEach(g => { initial[g.label] = true; });
    return initial;
  });

  // Client-side favorites (per-browser). No schema change.
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch { /* ignore */ }
  }, [favorites]);

  const toggleFavorite = (href: string) => {
    setFavorites((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href].slice(0, 8)
    );
  };

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  const canAccessItem = (item: NavItem): boolean => {
    if (isSuperAdmin()) return true;
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission as any);
  };

  const canAccessGroup = (group: NavGroup): boolean => {
    if (isSuperAdmin()) return true;
    return group.items.some(item => canAccessItem(item));
  };

  // Resolve favorite items by looking them up across all groups
  const favoriteItems = useMemo(() => {
    const flat: NavItem[] = allGroups.flatMap((g) => g.items);
    return favorites
      .map((href) => flat.find((it) => it.href === href))
      .filter((it): it is NavItem => !!it && canAccessItem(it));
  }, [favorites, allGroups, isSuperAdmin, hasPermission]);

  const sidebarContent = (

    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-sidebar-primary-foreground font-bold text-lg">V</span>
        </div>
        {!collapsed && (
          <span className="text-sidebar-foreground font-bold text-lg truncate">
            Vogantra
          </span>
        )}
      </div>

      {/* User Profile */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 flex items-center justify-center flex-shrink-0 ring-2 ring-sidebar-primary/20">
              <span className="text-sidebar-primary-foreground text-sm font-bold">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'المستخدم'}
              </p>
              <p className="text-[11px] text-sidebar-muted truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Go to Platform Admin (only for platform admins) */}
      {isPlatformAdmin && (
        <div className={cn("px-2 py-2 border-b border-sidebar-border", collapsed && "px-1")}>
          <Link
            to="/platform"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
              "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:shadow-lg hover:scale-[1.02]",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? 'الذهاب إلى لوحة المنصة' : undefined}
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>لوحة المنصة</span>}
          </Link>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-3 px-2 space-y-0.5">
          <TooltipProvider delayDuration={0}>
            {allGroups.map((group) => {
              if (!canAccessGroup(group)) return null;

              const isPlatformSection = group.label === 'إدارة المنصة';
              const visibleItems = group.items.filter(canAccessItem);
              if (visibleItems.length === 0) return null;
              const GroupIcon = group.icon;
              const hasActiveItem = visibleItems.some(i => isActive(i.href));

              return (
                <div key={group.label} className={cn(
                  "mb-0.5",
                  isPlatformSection && "mt-3 pt-3 border-t border-sidebar-border"
                )}>
                  {!collapsed ? (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors rounded-lg",
                        hasActiveItem ? "text-sidebar-primary" : "",
                        isPlatformSection
                          ? "text-warning hover:text-warning/80"
                          : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <GroupIcon className="h-3.5 w-3.5" />
                        {group.label}
                      </span>
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        !openGroups[group.label] && "-rotate-90 rtl:rotate-90"
                      )} />
                    </button>
                  ) : (
                    <div className={cn(
                      "h-px my-2 mx-1",
                      isPlatformSection ? "bg-warning/30" : "bg-sidebar-border"
                    )} />
                  )}

                  {(collapsed || openGroups[group.label]) && (
                    <div className="space-y-0.5 mt-0.5">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const isFav = favorites.includes(item.href);

                        const linkContent = (
                          <Link
                            to={item.href}
                            onClick={onMobileClose}
                            className={cn(
                              "group/nav relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              collapsed && "justify-center px-2",
                              active
                                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                            )}
                          >
                            {active && !collapsed && (
                              <span className="absolute inset-y-1.5 right-0 w-0.5 rounded-full bg-sidebar-primary" />
                            )}
                            <Icon className={cn(
                              "h-[18px] w-[18px] flex-shrink-0",
                              active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover/nav:text-sidebar-foreground"
                            )} />
                            {!collapsed && <span className="truncate">{item.title}</span>}
                            {!collapsed && item.badge && (
                              <span className="mr-auto text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                            {!collapsed && (
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.href); }}
                                aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                                className={cn(
                                  "ms-auto p-0.5 rounded transition-opacity",
                                  isFav ? "opacity-100 text-warning" : "opacity-0 group-hover/nav:opacity-60 hover:opacity-100 text-sidebar-muted"
                                )}
                              >
                                <Star className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                              </button>
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
      </ScrollArea>

      {/* Collapse Toggle (desktop) */}
      <div className="hidden lg:flex border-t border-sidebar-border p-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm"
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          ) : (
            <>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              <span>طي القائمة</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-72 bg-sidebar transition-transform duration-300 lg:hidden shadow-2xl",
        mobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <button
          onClick={onMobileClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent z-10"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:right-0 bg-sidebar border-l border-sidebar-border transition-all duration-300 z-30",
        collapsed ? "lg:w-[68px]" : "lg:w-64"
      )}>
        {sidebarContent}
      </aside>
    </>
  );
};

export default DashboardSidebar;
