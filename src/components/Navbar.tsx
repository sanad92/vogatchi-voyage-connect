
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Home,
  Calendar,
  Users,
  Receipt,
  BarChart3,
  Building,
  Plane,
  MessageSquare,
  LogOut,
  Menu,
  X,
  DollarSign,
  CreditCard,
  UserCheck
} from "lucide-react";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast({
        title: "تم تسجيل الخروج بنجاح",
        description: "شكراً لاستخدام نظام إدارة الرحلات",
      });
    } catch (error) {
      toast({
        title: "خطأ في تسجيل الخروج",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { name: "الرئيسية", href: "/", icon: Home },
    { name: "الحجوزات", href: "/bookings", icon: Calendar },
    { name: "العملاء", href: "/customers", icon: Users },
    { name: "الفواتير", href: "/invoices", icon: Receipt },
    { name: "الأسعار المرنة", href: "/customer-pricing", icon: DollarSign },
    { name: "أوامر الدفع", href: "/payment-orders", icon: CreditCard },
    { name: "التقارير", href: "/reports", icon: BarChart3 },
    { name: "الموردين", href: "/suppliers", icon: Building },
    { name: "الرحلات", href: "/trips", icon: Plane },
    { name: "الموظفين", href: "/employees", icon: UserCheck },
    { name: "واتساب", href: "/whatsapp", icon: MessageSquare },
  ];

  const financialItems = [
    { name: "الفواتير", href: "/invoices", icon: Receipt },
    { name: "الأسعار المرنة", href: "/customer-pricing", icon: DollarSign },
    { name: "أوامر الدفع", href: "/payment-orders", icon: CreditCard },
  ];

  const managementItems = [
    { name: "العملاء", href: "/customers", icon: Users },
    { name: "الموردين", href: "/suppliers", icon: Building },
    { name: "الموظفين", href: "/employees", icon: UserCheck },
  ];

  const operationsItems = [
    { name: "الحجوزات", href: "/bookings", icon: Calendar },
    { name: "الرحلات", href: "/trips", icon: Plane },
    { name: "واتساب", href: "/whatsapp", icon: MessageSquare },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              Vogatchi Travel
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 space-x-reverse">
            <NavigationMenu>
              <NavigationMenuList className="flex space-x-2 space-x-reverse">
                <NavigationMenuItem>
                  <Link
                    to="/"
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-blue-600"
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    الرئيسية
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-gray-600 hover:text-blue-600">
                    العمليات
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4">
                      {operationsItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                              isActive(item.href) ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-gray-600 hover:text-blue-600">
                    النظام المالي
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4">
                      {financialItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                              isActive(item.href) ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-gray-600 hover:text-blue-600">
                    الإدارة
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-[400px] gap-3 p-4">
                      {managementItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                              isActive(item.href) ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    to="/reports"
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/reports") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-blue-600"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    التقارير
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2 p-3 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href) ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-blue-600"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
