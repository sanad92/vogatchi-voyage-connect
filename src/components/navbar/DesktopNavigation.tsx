
import { Location } from "react-router-dom";
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import PermissionNavLink from "./PermissionNavLink";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";

interface DesktopNavigationProps {
  userRole: string | null;
  hasRole: (role: string) => boolean;
  location: Location;
}

const DesktopNavigation = ({ userRole, hasRole, location }: DesktopNavigationProps) => {
  const { isSuperAdmin } = useOptimizedAuth();

  return (
    <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
      {/* Main Navigation */}
      {mainNavItems.map((item) => (
        <PermissionNavLink key={item.to} item={item} />
      ))}
      
      {/* Business Navigation */}
      {businessNavItems.slice(0, 6).map((item) => (
        <PermissionNavLink key={item.to} item={item} />
      ))}
      
      {/* Communication Navigation */}
      {communicationNavItems.map((item) => (
        <PermissionNavLink key={item.to} item={item} />
      ))}
      
      {/* Admin Settings - Only for Super Admin */}
      {isSuperAdmin() && adminNavItems.map((item) => (
        <PermissionNavLink key={item.to} item={item} />
      ))}
    </div>
  );
};

export default DesktopNavigation;
