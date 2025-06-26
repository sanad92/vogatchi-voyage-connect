
export interface NavItem {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  allowedRoles?: string[];
  requiredPermissions?: string[];
}

export interface NavigationItem {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  allowedRoles?: string[];
  requiredPermissions?: string[];
}
