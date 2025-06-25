
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
        className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
          isActiveGroup 
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700' 
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
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
                className={`flex items-center gap-3 px-8 py-3 text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-r-2 border-blue-500' 
                    : 'text-gray-600 hover:bg-white hover:text-blue-700'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
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
    <div className="lg:hidden bg-white border-t border-gray-200 shadow-lg animate-in slide-in-from-top-4">
      {/* User Info Header */}
      <div className="px-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium">مرحباً</p>
            <p className="text-xs text-blue-100 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin">
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
      <div className="border-t border-gray-100 p-4">
        <button
          onClick={() => {
            signOut();
            onClose();
          }}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
        >
          <LogOut className="h-5 w-5" />
          تسجيل خروج
        </button>
      </div>
    </div>
  );
};

export default EnhancedMobileNavigation;
