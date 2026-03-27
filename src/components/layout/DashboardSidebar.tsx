import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Hotel, Plane, Car, Truck, Receipt,
  FileText, Building2, Calculator, TrendingUp, Calendar,
  MessageSquare, Settings, ChevronDown, ChevronLeft, ChevronRight,
  CreditCard, Briefcase, BarChart3, UserCheck, X, Shield, FileCheck, Zap, ClipboardList
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredPermission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  requiredPermission?: string; // If set, entire group requires this
}

const navGroups: NavGroup[] = [
  {
    label: 'الرئيسية',
    items: [
      { title: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
      { title: 'تقويم الحجوزات', href: '/bookings-calendar', icon: Calendar, requiredPermission: 'bookings_view' },
      { title: 'العمليات اليومية', href: '/daily-operations', icon: Briefcase, requiredPermission: 'bookings_view' },
    ],
  },
  {
    label: 'الحجوزات',
    requiredPermission: 'bookings_view',
    items: [
      { title: 'الحجوزات الموحدة', href: '/bookings', icon: ClipboardList, requiredPermission: 'bookings_view' },
      { title: 'عروض الأسعار', href: '/quotes', icon: FileCheck, requiredPermission: 'quotes_view' },
      { title: 'حجوزات الفنادق', href: '/hotel-bookings', icon: Hotel, requiredPermission: 'bookings_view' },
      { title: 'حجوزات الطيران', href: '/flight-bookings', icon: Plane, requiredPermission: 'bookings_view' },
      { title: 'تأجير السيارات', href: '/car-rentals', icon: Car, requiredPermission: 'bookings_view' },
      { title: 'النقل', href: '/transport-bookings', icon: Truck, requiredPermission: 'bookings_view' },
    ],
  },
  {
    label: 'العملاء',
    requiredPermission: 'customers_view',
    items: [
      { title: 'إدارة العملاء', href: '/customers', icon: Users, requiredPermission: 'customers_view' },
      { title: 'خدمة العملاء', href: '/customer-service', icon: MessageSquare, requiredPermission: 'customer_service_view' },
      { title: 'CRM', href: '/crm', icon: UserCheck, requiredPermission: 'crm_view' },
    ],
  },
  {
    label: 'المالية',
    requiredPermission: 'invoices_view',
    items: [
      { title: 'الفواتير', href: '/invoices', icon: Receipt, requiredPermission: 'invoices_view' },
      { title: 'المستندات', href: '/documents', icon: FileText, requiredPermission: 'documents_view' },
      { title: 'أوامر الدفع', href: '/payment-orders', icon: CreditCard, requiredPermission: 'financial_view' },
      { title: 'الحسابات البنكية', href: '/bank-accounts', icon: Building2, requiredPermission: 'financial_view' },
      { title: 'المصروفات', href: '/expense-management', icon: Calculator, requiredPermission: 'expenses_view' },
    ],
  },
  {
    label: 'التقارير',
    requiredPermission: 'reports_view',
    items: [
      { title: 'التقارير', href: '/reports', icon: FileText, requiredPermission: 'reports_view' },
      { title: 'الأرباح والخسائر', href: '/profit-loss-reports', icon: TrendingUp, requiredPermission: 'reports_view' },
      { title: 'تحليل الأرباح', href: '/profit-analytics', icon: BarChart3, requiredPermission: 'reports_advanced' },
      { title: 'الإحصائيات', href: '/crm-dashboard', icon: BarChart3, requiredPermission: 'crm_view' },
    ],
  },
  {
    label: 'الإدارة',
    requiredPermission: 'employees_view',
    items: [
      { title: 'الموردين', href: '/suppliers', icon: Truck, requiredPermission: 'suppliers_view' },
      { title: 'الموظفين', href: '/employees-enhanced', icon: Users, requiredPermission: 'employees_view' },
      { title: 'الفريق', href: '/team', icon: Users, requiredPermission: 'team_invite' },
      { title: 'الأتمتة', href: '/automation', icon: Zap, requiredPermission: 'automation_view' },
      { title: 'سجل التدقيق', href: '/audit-log', icon: Shield, requiredPermission: 'audit_view' },
      { title: 'الإعدادات', href: '/admin-settings', icon: Settings, requiredPermission: 'admin_settings' },
    ],
  },
];

const platformAdminGroup: NavGroup = {
  label: 'إدارة المنصة',
  items: [
    { title: 'نظرة عامة', href: '/platform-admin', icon: Shield },
    { title: 'المؤسسات', href: '/platform-admin/organizations', icon: Building2 },
    { title: 'الاشتراكات', href: '/platform-admin/subscriptions', icon: CreditCard },
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
  const { user, profile, isSuperAdmin } = useOptimizedAuth();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { hasPermission } = useSupabasePermissions();

  const allGroups = isPlatformAdmin ? [...navGroups, platformAdminGroup] : navGroups;

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    allGroups.forEach(g => { initial[g.label] = true; });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location.pathname === href;

  const canAccessItem = (item: NavItem): boolean => {
    if (isSuperAdmin()) return true;
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission as any);
  };

  const canAccessGroup = (group: NavGroup): boolean => {
    if (isSuperAdmin()) return true;
    // Check if at least one item in the group is accessible
    return group.items.some(item => canAccessItem(item));
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-sidebar-primary-foreground font-bold text-lg">V</span>
        </div>
        {!collapsed && (
          <span className="text-sidebar-foreground font-bold text-lg truncate">
            Hostretor.online
          </span>
        )}
      </div>

      {/* User Profile */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <span className="text-sidebar-primary-foreground text-sm font-bold">
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'المستخدم'}
              </p>
              <p className="text-xs text-sidebar-muted truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin space-y-1">
        <TooltipProvider delayDuration={0}>
          {allGroups.map((group) => {
            // Skip entire group if no items are accessible
            if (!canAccessGroup(group)) return null;

            const isPlatformSection = group.label === 'إدارة المنصة';
            const visibleItems = group.items.filter(canAccessItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className={cn("mb-1", isPlatformSection && "mt-4 pt-3 border-t border-sidebar-border")}>
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                      isPlatformSection
                        ? "text-warning hover:text-warning/80"
                        : "text-sidebar-muted hover:text-sidebar-foreground"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {isPlatformSection && <Shield className="h-3 w-3" />}
                      {group.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3.5 w-3.5 transition-transform",
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
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      const linkContent = (
                        <Link
                          to={item.href}
                          onClick={onMobileClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                            collapsed && "justify-center px-2",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", active && "text-sidebar-primary-foreground")} />
                          {!collapsed && <span className="truncate">{item.title}</span>}
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
          className="absolute top-4 left-4 p-1 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent z-10"
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
