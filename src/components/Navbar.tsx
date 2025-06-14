
import { Link, useLocation } from "react-router-dom";
import { User, Users, FileText, MessageCircle, Receipt } from "lucide-react";

const menu = [
  { name: "لوحة التحكم", route: "/", icon: <FileText size={18} /> },
  { name: "العملاء", route: "/customers", icon: <User size={18} /> },
  { name: "الموظفون", route: "/employees", icon: <Users size={18} /> },
  { name: "الفواتير", route: "/invoices", icon: <Receipt size={18} /> },
  { name: "محادثات الواتساب", route: "/whatsapp", icon: <MessageCircle size={18} color="#25d366" /> },
  { name: "تقارير", route: "/reports", icon: <FileText size={18} /> },
  { name: "أرشيف الرحلات", route: "/trips", icon: <FileText size={18} /> },
]

const Navbar = () => {
  const location = useLocation();
  return (
    <nav className="w-full px-6 py-3 bg-gradient-to-r from-blue-50 to-orange-50 border-b flex items-center justify-between" dir="rtl">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-blue-700 tracking-wide">Vogatchi CRM</span>
      </div>
      <div className="flex items-center gap-2">
        {menu.map(item => (
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
    </nav>
  );
};

export default Navbar;
