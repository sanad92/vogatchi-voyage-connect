
import { Location } from "react-router-dom";
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import PermissionNavLink from "./PermissionNavLink";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { Button } from "../ui/button";
import { LogOut, User } from "lucide-react";

interface DesktopNavigationProps {
  userRole: string | null;
  hasRole: (role: string) => boolean;
  location: Location;
}

const DesktopNavigation = ({ userRole, hasRole, location }: DesktopNavigationProps) => {
  const { isSuperAdmin, signOut, user, profile } = useOptimizedAuth();

  const handleSignOut = async () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      await signOut();
    }
  };

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

      {/* User Info and Logout */}
      <div className="flex items-center gap-2 mr-4 border-r pr-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{profile?.full_name || user?.email?.split('@')[0] || 'مستخدم'}</span>
          {userRole && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {userRole}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          title="تسجيل الخروج"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DesktopNavigation;
