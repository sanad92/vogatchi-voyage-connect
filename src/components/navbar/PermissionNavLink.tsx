
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  allowedRoles?: string[];
  requiredPermissions?: string[];
}

interface PermissionNavLinkProps {
  item: NavItem;
  onClick?: () => void;
  className?: string;
}

const PermissionNavLink = ({ item, onClick, className }: PermissionNavLinkProps) => {
  const location = useLocation();
  const { isSuperAdmin, hasRole } = useOptimizedAuth();
  
  const isActiveLink = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  // تحقق من الصلاحيات
  const hasPermission = () => {
    // السوبر أدمن له صلاحية على كل شيء
    if (isSuperAdmin()) return true;
    
    // إذا لم تكن هناك أدوار مطلوبة، اسمح بالوصول
    if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
    
    // تحقق من وجود أي من الأدوار المطلوبة
    return item.allowedRoles.some(role => hasRole(role));
  };

  // إذا لم تكن هناك صلاحية، لا تظهر الرابط
  if (!hasPermission()) {
    return null;
  }

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={className || `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
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

export default PermissionNavLink;
