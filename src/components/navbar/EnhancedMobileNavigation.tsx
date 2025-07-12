
import { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { User } from "@supabase/supabase-js";
import { Location } from "react-router-dom";

interface EnhancedMobileNavigationProps {
  isOpen: boolean;
  userRole: string | null;
  hasRole: (role: string) => boolean;
  location: Location;
  user: User;
  signOut: () => Promise<void>;
  onClose: () => void;
}

interface NavigationGroup {
  title: string;
  items: any[];
}

const MobileNavigationGroup = ({ 
  title, 
  items, 
  onItemClick 
}: { 
  title: string; 
  items: any[]; 
  onItemClick: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  const isActiveGroup = items.some(item => 
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-3 py-3 text-left text-sm font-medium transition-all duration-200 min-h-[44px] ${
          isActiveGroup 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700' 
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="truncate">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="bg-gray-50 animate-in slide-in-from-top-2">
          {items.map((item) => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 min-h-[44px] ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-r-2 border-blue-500' 
                    : 'text-gray-600 hover:bg-white hover:text-blue-700'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EnhancedMobileNavigation = ({ 
  isOpen, 
  userRole, 
  hasRole, 
  location, 
  user, 
  signOut, 
  onClose 
}: EnhancedMobileNavigationProps) => {
  const { isSuperAdmin } = useOptimizedAuth();

  if (!isOpen) return null;

  const navigationGroups: NavigationGroup[] = [
    { title: "العمليات الرئيسية", items: mainNavItems },
    { title: "إدارة الأعمال", items: businessNavItems },
    { title: "التقارير والتواصل", items: communicationNavItems },
  ];

  if (isSuperAdmin()) {
    navigationGroups.push({ title: "إعدادات النظام", items: adminNavItems });
  }

  return (
    <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-top-4 max-h-[calc(100vh-4rem)] overflow-hidden z-50">
      {/* User Info Header */}
      <div className="px-3 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">مرحباً</p>
            <p className="text-xs text-blue-100 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
        {navigationGroups.map((group) => (
          <MobileNavigationGroup
            key={group.title}
            title={group.title}
            items={group.items}
            onItemClick={onClose}
          />
        ))}
      </div>

      {/* Sign Out */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={() => {
            signOut();
            onClose();
          }}
          className="flex items-center gap-3 w-full px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 min-h-[44px]"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">تسجيل خروج</span>
        </button>
      </div>
    </div>
  );
};

export default EnhancedMobileNavigation;
