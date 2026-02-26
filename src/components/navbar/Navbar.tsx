
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import SuperAdminBanner from "@/components/admin/SuperAdminBanner";
import EnhancedDesktopNavigation from "./EnhancedDesktopNavigation";
import EnhancedMobileNavigation from "./EnhancedMobileNavigation";
import OrgSwitcher from "@/components/org/OrgSwitcher";

const Navbar = () => {
  const { user, signOut, userRole, hasRole } = useOptimizedAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'super_admin': return 'سوبر أدمن';
      case 'admin': return 'أدمن';
      case 'manager': return 'مدير';
      case 'sales_agent': return 'مندوب مبيعات';
      case 'accountant': return 'محاسب';
      default: return 'مشاهد';
    }
  };

  return (
    <>
      <SuperAdminBanner />
      <nav className="bg-background shadow-lg border-b border-border sticky top-0 z-40">
        <div className="w-full max-w-none px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2 rtl:space-x-reverse group min-w-0 flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <span className="text-white font-bold text-sm sm:text-lg">V</span>
              </div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hidden xs:block truncate">
                Vogatchi CRM
              </span>
              <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent xs:hidden">
                V
              </span>
            </Link>

            {/* Enhanced Desktop Navigation */}
            <div className="hidden xl:flex">
              <EnhancedDesktopNavigation 
                userRole={userRole} 
                hasRole={hasRole} 
                location={location} 
              />
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4 rtl:space-x-reverse min-w-0">
              <OrgSwitcher />
              <div className="hidden lg:flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                <div className="text-right rtl:text-left min-w-0 max-w-[10rem]">
                  <p className="text-xs text-muted-foreground truncate">
                    {getRoleDisplayName(userRole)}
                  </p>
                </div>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white text-xs lg:text-sm font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="lg:hidden w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <Button 
                variant="outline" 
                onClick={signOut} 
                size="sm"
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors duration-200 flex-shrink-0 px-2 lg:px-3"
              >
                <span className="hidden lg:inline">تسجيل الخروج</span>
                <span className="lg:hidden">خروج</span>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200 min-w-[44px] min-h-[44px]"
                aria-label="فتح القائمة"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Navigation */}
          <div className="md:hidden">
            <EnhancedMobileNavigation 
              isOpen={isMobileMenuOpen}
              userRole={userRole}
              hasRole={hasRole}
              location={location}
              user={user}
              signOut={signOut}
              onClose={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
