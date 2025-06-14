
import { LogOut } from "lucide-react";
import { mainNavItems, businessNavItems, communicationNavItems } from "./NavigationItems";
import NavLink from "./NavLink";
import { Profile } from "@/types/auth";

interface MobileNavigationProps {
  isOpen: boolean;
  profile: Profile | null;
  onSignOut: () => void;
  onLinkClick: () => void;
}

const MobileNavigation = ({ isOpen, profile, onSignOut, onLinkClick }: MobileNavigationProps) => {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden py-4 border-t bg-white">
      <div className="space-y-2">
        {/* User Info */}
        {profile && (
          <div className="px-3 py-2 text-sm text-gray-600 border-b">
            مرحباً، {profile.full_name}
          </div>
        )}

        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
            العمليات الرئيسية
          </div>
          {mainNavItems.map((item) => (
            <NavLink 
              key={item.href} 
              item={item} 
              onClick={onLinkClick} 
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
              key={item.href} 
              item={item} 
              onClick={onLinkClick} 
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
              key={item.href} 
              item={item} 
              onClick={onLinkClick} 
            />
          ))}
        </div>

        {/* Sign Out */}
        <div className="border-t pt-2">
          <button
            onClick={() => {
              onSignOut();
              onLinkClick();
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
