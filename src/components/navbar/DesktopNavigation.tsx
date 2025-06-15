
import { Location } from "react-router-dom";
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import NavLink from "./NavLink";
import { useAuth } from "@/hooks/useAuth";

interface DesktopNavigationProps {
  userRole: string | null;
  hasRole: (role: string) => boolean;
  location: Location;
}

const DesktopNavigation = ({ userRole, hasRole, location }: DesktopNavigationProps) => {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
      {/* Main Navigation */}
      {mainNavItems.map((item) => (
        <NavLink key={item.to} item={item} />
      ))}
      
      {/* Business Navigation */}
      {businessNavItems.map((item) => (
        <NavLink key={item.to} item={item} />
      ))}
      
      {/* Communication Navigation */}
      {communicationNavItems.map((item) => (
        <NavLink key={item.to} item={item} />
      ))}
      
      {/* Admin Settings - Only for Super Admin */}
      {isSuperAdmin() && adminNavItems.map((item) => (
        <NavLink key={item.to} item={item} />
      ))}
    </div>
  );
};

export default DesktopNavigation;
