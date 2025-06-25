
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import SuperAdminBanner from "@/components/admin/SuperAdminBanner";
import EnhancedDesktopNavigation from "./EnhancedDesktopNavigation";
import EnhancedMobileNavigation from "./EnhancedMobileNavigation";

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
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-105">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Vogatchi CRM
              </span>
            </Link>

            {/* Enhanced Desktop Navigation */}
            <EnhancedDesktopNavigation 
              userRole={userRole} 
              hasRole={hasRole} 
              location={location} 
            />

            {/* User Menu */}
            <div className="hidden lg:flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="text-right rtl:text-left">
                  <p className="text-sm font-medium text-gray-900">مرحباً</p>
                  <p className="text-xs text-gray-500">
                    {getRoleDisplayName(userRole)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={signOut} 
                size="sm"
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors duration-200"
              >
                تسجيل الخروج
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Enhanced Mobile Navigation */}
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
      </nav>
    </>
  );
};

export default Navbar;
