
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavLinkProps {
  item: NavItem;
  onClick?: () => void;
}

const NavLink = ({ item, onClick }: NavLinkProps) => {
  const location = useLocation();
  
  const isActiveLink = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
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
};

export default NavLink;
