
import { LogOut } from "lucide-react";
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import NavLink from "./NavLink";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@supabase/supabase-js";
import { Location } from "react-router-dom";

interface MobileNavigationProps {
  isOpen: boolean;
  userRole: string | null;
  hasRole: (role: string) => boolean;
  location: Location;
  user: User;
  signOut: () => Promise<void>;
}

const MobileNavigation = ({ isOpen, userRole, hasRole, location, user, signOut }: MobileNavigationProps) => {
  const { isSuperAdmin } = useAuth();

  if (!isOpen) return null;

  const handleClose = () => {
    // This would need to be passed from parent, but for now we'll handle it differently
  };

  return (
    <div className="lg:hidden py-4 border-t bg-white">
      <div className="space-y-2">
        {/* User Info */}
        <div className="px-3 py-2 text-sm text-gray-600 border-b">
          مرحباً، {user.email}
        </div>

        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
            العمليات الرئيسية
          </div>
          {mainNavItems.map((item) => (
            <NavLink 
              key={item.to} 
              item={item} 
              onClick={handleClose} 
            />
          ))}
        </div>

        {/* Business Navigation */}
        <div className="space-y-1 border-t pt-2">
          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
            إدارة الأعمال
          </div>
          {businessNavItems.map((item) => (
            <NavLink 
              key={item.to} 
              item={item} 
              onClick={handleClose} 
            />
          ))}
        </div>

        {/* Communication Navigation */}
        <div className="space-y-1 border-t pt-2">
          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
            التواصل والتقارير
          </div>
          {communicationNavItems.map((item) => (
            <NavLink 
              key={item.to} 
              item={item} 
              onClick={handleClose} 
            />
          ))}
        </div>

        {/* Admin Settings - Only for Super Admin */}
        {isSuperAdmin() && (
          <div className="space-y-1 border-t pt-2">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
              إعدادات النظام
            </div>
            {adminNavItems.map((item) => (
              <NavLink 
                key={item.to} 
                item={item} 
                onClick={handleClose} 
              />
            ))}
          </div>
        )}

        {/* Sign Out */}
        <div className="border-t pt-2">
          <button
            onClick={() => {
              signOut();
              handleClose();
            }}
            className="flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full"
          >
            <LogOut className="h-5 w-5" />
            تسجيل خروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileNavigation;
