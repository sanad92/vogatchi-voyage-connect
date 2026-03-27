
import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useSupabasePermissions } from "@/hooks/useSupabasePermissions";

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
  const { hasPermission } = useSupabasePermissions();
  
  const isActiveLink = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  const checkAccess = () => {
    // السوبر أدمن له صلاحية على كل شيء
    if (isSuperAdmin()) return true;
    
    // تحقق من الصلاحيات الدقيقة أولاً
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasRequiredPerm = item.requiredPermissions.some(p => hasPermission(p as any));
      if (!hasRequiredPerm) return false;
    }

    // تحقق من الأدوار المسموحة
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      return item.allowedRoles.some(role => hasRole(role));
    }
    
    // إذا لم تكن هناك أدوار أو صلاحيات محددة، اسمح بالوصول
    return true;
  };

  if (!checkAccess()) {
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
