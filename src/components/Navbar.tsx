
import { Link, useLocation } from "react-router-dom";
import { User, Users, FileText, MessageCircle, Receipt, Building, Calendar, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const menu = [
  { name: "لوحة التحكم", route: "/", icon: <FileText size={18} /> },
  { name: "العملاء", route: "/customers", icon: <User size={18} />, requiredRole: "sales_agent" },
  { name: "الموردين", route: "/suppliers", icon: <Building size={18} />, requiredRole: "manager" },
  { name: "الحجوزات", route: "/bookings", icon: <Calendar size={18} />, requiredRole: "sales_agent" },
  { name: "الموظفون", route: "/employees", icon: <Users size={18} />, requiredRole: "manager" },
  { name: "الفواتير", route: "/invoices", icon: <Receipt size={18} />, requiredRole: "accountant" },
  { name: "محادثات الواتساب", route: "/whatsapp", icon: <MessageCircle size={18} color="#25d366" />, requiredRole: "sales_agent" },
  { name: "تقارير", route: "/reports", icon: <FileText size={18} />, requiredRole: "viewer" },
  { name: "أرشيف الرحلات", route: "/trips", icon: <FileText size={18} />, requiredRole: "viewer" },
];

const Navbar = () => {
  const location = useLocation();
  const { profile, userRole, signOut, hasRole } = useAuth();

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      'admin': 'مدير النظام',
      'manager': 'مدير',
      'sales_agent': 'موظف مبيعات',
      'accountant': 'محاسب',
      'viewer': 'مراقب'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  return (
    <nav className="w-full px-6 py-3 bg-gradient-to-r from-blue-50 to-orange-50 border-b flex items-center justify-between" dir="rtl">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-blue-700 tracking-wide">Vogatchi CRM</span>
      </div>
      
      <div className="flex items-center gap-2">
        {menu
          .filter(item => !item.requiredRole || hasRole(item.requiredRole))
          .map(item => (
            <Link
              key={item.route}
              to={item.route}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition 
                ${location.pathname === item.route ? "bg-orange-100 text-blue-700 shadow" : "hover:bg-blue-100 hover:text-blue-800 text-gray-700"}
              `}
            >
              {item.icon} <span>{item.name}</span>
            </Link>
          ))}
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 hover:bg-blue-100">
              <UserCircle size={20} />
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">{getRoleDisplayName(userRole || '')}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>الحساب الشخصي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <User size={16} />
              البروفايل الشخصي
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={signOut}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut size={16} />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default Navbar;
