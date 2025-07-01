
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
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
};

export default PermissionNavLink;
