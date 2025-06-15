
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  allowedRoles: string[];
}

interface NavLinkProps {
  item: NavItem;
  onClick?: () => void;
}

const NavLink = ({ item, onClick }: NavLinkProps) => {
  const location = useLocation();
  
  const isActiveLink = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isActiveLink(item.to)
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
};

export default NavLink;
