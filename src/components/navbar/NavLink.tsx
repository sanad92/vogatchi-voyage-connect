
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
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
};

export default NavLink;
