
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, User } from "lucide-react";
import { mainNavItems, businessNavItems, communicationNavItems, adminNavItems } from "./NavigationItems";
import PermissionNavLink from "./PermissionNavLink";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";

interface MobileNavigationProps {
  userRole: string | null;
  hasRole: (role: string) => boolean;
}

const MobileNavigation = ({ userRole, hasRole }: MobileNavigationProps) => {
  const [open, setOpen] = useState(false);
  const { isSuperAdmin, signOut, user, profile } = useOptimizedAuth();

  const handleSignOut = async () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      setOpen(false);
      await signOut();
    }
  };

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <div className="flex flex-col h-full">
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 border-b mb-4">
              <User className="h-8 w-8 text-gray-600" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {profile?.full_name || user?.email?.split('@')[0] || 'مستخدم'}
                </div>
                {userRole && (
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-1 inline-block">
                    {userRole}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 space-y-2">
              {/* Main Navigation */}
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500 px-2 mb-2">القائمة الرئيسية</h3>
                {mainNavItems.map((item) => (
                  <PermissionNavLink 
                    key={item.to} 
                    item={item} 
                    onClick={() => setOpen(false)}
                    className="block w-full"
                  />
                ))}
              </div>

              {/* Business Navigation */}
              <div className="space-y-1 pt-4">
                <h3 className="text-sm font-medium text-gray-500 px-2 mb-2">العمليات</h3>
                {businessNavItems.map((item) => (
                  <PermissionNavLink 
                    key={item.to} 
                    item={item} 
                    onClick={() => setOpen(false)}
                    className="block w-full"
                  />
                ))}
              </div>

              {/* Communication Navigation */}
              <div className="space-y-1 pt-4">
                <h3 className="text-sm font-medium text-gray-500 px-2 mb-2">التواصل</h3>
                {communicationNavItems.map((item) => (
                  <PermissionNavLink 
                    key={item.to} 
                    item={item} 
                    onClick={() => setOpen(false)}
                    className="block w-full"
                  />
                ))}
              </div>

              {/* Admin Settings - Only for Super Admin */}
              {isSuperAdmin() && (
                <div className="space-y-1 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 px-2 mb-2">الإدارة</h3>
                  {adminNavItems.map((item) => (
                    <PermissionNavLink 
                      key={item.to} 
                      item={item} 
                      onClick={() => setOpen(false)}
                      className="block w-full"
                    />
                  ))}
                </div>
              )}
            </nav>

            {/* Logout Button */}
            <div className="border-t pt-4 mt-4">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNavigation;
