
import { Location } from "react-router-dom";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import NavigationDropdown from "./NavigationDropdown";
import PermissionNavLink from "./PermissionNavLink";
import { 
  Briefcase, 
  BarChart3, 
  Settings, 
  Home,
  Calendar
} from "lucide-react";

interface EnhancedDesktopNavigationProps {
  userRole: string | null;
  hasRole: (role: string) => boolean;
  location: Location;
}

const EnhancedDesktopNavigation = ({ userRole, hasRole, location }: EnhancedDesktopNavigationProps) => {
  const { isSuperAdmin } = useOptimizedAuth();

  return (
    <div className="hidden lg:flex items-center space-x-2 rtl:space-x-reverse">
      {/* الصفحة الرئيسية - مباشرة */}
      <PermissionNavLink item={{
        to: "/",
        icon: Home,
        label: "الرئيسية",
        allowedRoles: [],
        requiredPermissions: []
      }} />

      {/* العمليات اليومية - مباشرة */}
      <PermissionNavLink item={{
        to: "/daily-operations",
        icon: Calendar,
        label: "العمليات اليومية",
        allowedRoles: [],
        requiredPermissions: ['bookings_view']
      }} />

      {/* إدارة الأعمال - Dropdown */}
      <NavigationDropdown
        title="إدارة الأعمال"
        icon={Briefcase}
        items={businessNavItems}
      />

      {/* التقارير والتواصل - Dropdown */}
      <NavigationDropdown
        title="التقارير والتواصل"
        icon={BarChart3}
        items={communicationNavItems}
      />

      {/* إعدادات النظام - للسوبر أدمن فقط */}
      {isSuperAdmin() && (
        <NavigationDropdown
          title="إعدادات النظام"
          icon={Settings}
          items={adminNavItems}
        />
      )}
    </div>
  );
};

export default EnhancedDesktopNavigation;
