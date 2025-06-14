
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Settings,
  LogOut,
  Building,
  CreditCard,
  BarChart3,
  ClipboardList
} from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const mainNavItems = [
    { name: "الرئيسية", href: "/", icon: Home },
    { name: "العمليات اليومية", href: "/daily-operations", icon: ClipboardList },
    { name: "العملاء", href: "/customers", icon: Users },
    { name: "الحجوزات", href: "/bookings", icon: Calendar },
    { name: "خدمة العملاء", href: "/customer-service", icon: MessageSquare },
  ];

  const businessNavItems = [
    { name: "الموردين", href: "/suppliers", icon: Building },
    { name: "الرحلات", href: "/trips", icon: Calendar },
    { name: "الفواتير", href: "/invoices", icon: FileText },
    { name: "أوامر الدفع", href: "/payment-orders", icon: CreditCard },
    { name: "تسعير العملاء", href: "/customer-pricing", icon: BarChart3 },
  ];

  const communicationNavItems = [
    { name: "واتساب", href: "/whatsapp", icon: MessageSquare },
    { name: "التقارير", href: "/reports", icon: BarChart3 },
    { name: "الموظفين", href: "/employees", icon: Users },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const NavLink = ({ item, onClick }: { item: any; onClick?: () => void }) => (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActiveLink(item.href)
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </Link>
  );

  return (
    <nav className="bg-white shadow-lg border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 text-xl font-bold text-blue-700"
          >
            <Calendar className="h-8 w-8" />
            <span className="hidden sm:block">Vogatchi Tourism</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {/* Main Actions */}
            <div className="flex items-center gap-1">
              {mainNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300"></div>

            {/* Business Actions */}
            <div className="flex items-center gap-1">
              {businessNavItems.slice(0, 3).map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>

            {/* Communication */}
            <div className="flex items-center gap-1">
              <NavLink item={communicationNavItems[0]} />
            </div>
          </div>

          {/* User Menu & Mobile Toggle */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            {profile && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <span>مرحباً، {profile.full_name}</span>
              </div>
            )}

            {/* Sign Out */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل خروج
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
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
                    onClick={() => setIsOpen(false)} 
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
                    onClick={() => setIsOpen(false)} 
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
                    onClick={() => setIsOpen(false)} 
                  />
                ))}
              </div>

              {/* Sign Out */}
              <div className="border-t pt-2">
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full"
                >
                  <LogOut className="h-5 w-5" />
                  تسجيل خروج
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
