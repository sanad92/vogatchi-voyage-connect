
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import SuperAdminBanner from "@/components/admin/SuperAdminBanner";
import DesktopNavigation from "./navbar/DesktopNavigation";
import MobileNavigation from "./navbar/MobileNavigation";

const Navbar = () => {
  const { user, signOut, userRole, hasRole } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <SuperAdminBanner />
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Vogatchi CRM
              </span>
            </Link>

            {/* Desktop Navigation */}
            <DesktopNavigation 
              userRole={userRole} 
              hasRole={hasRole} 
              location={location} 
            />

            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="text-right rtl:text-left">
                  <p className="text-sm font-medium text-gray-900">مرحباً</p>
                  <p className="text-xs text-gray-500">
                    {userRole === 'super_admin' ? 'سوبر أدمن' : 
                     userRole === 'admin' ? 'أدمن' : 
                     userRole === 'manager' ? 'مدير' : 
                     userRole === 'sales_agent' ? 'مندوب مبيعات' : 
                     userRole === 'accountant' ? 'محاسب' : 'مشاهد'}
                  </p>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <Button variant="outline" onClick={signOut} size="sm">
                تسجيل الخروج
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <MobileNavigation 
              isOpen={isMobileMenuOpen}
              userRole={userRole}
              hasRole={hasRole}
              location={location}
              user={user}
              signOut={signOut}
            />
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
