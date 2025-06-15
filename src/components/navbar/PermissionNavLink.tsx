
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { usePermissionCheck } from "@/hooks/usePermissionCheck";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  allowedRoles: string[];
  requiredPermissions?: string[];
}

interface PermissionNavLinkProps {
  item: NavItem;
  onClick?: () => void;
}

const PermissionNavLink = ({ item, onClick }: PermissionNavLinkProps) => {
  const location = useLocation();
  const { hasAnyPermission } = usePermissionCheck();
  const { isSuperAdmin } = useAuth();
  
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
    
    // إذا لم تكن هناك صلاحيات مطلوبة، اسمح بالوصول
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
    
    // تحقق من وجود أي من الصلاحيات المطلوبة
    return hasAnyPermission(item.requiredPermissions as any[]);
  };

  // إذا لم تكن هناك صلاحية، لا تظهر الرابط
  if (!hasPermission()) {
    return null;
  }

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

export default PermissionNavLink;
