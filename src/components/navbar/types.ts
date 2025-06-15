
import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  title: string;
  icon: LucideIcon;
  path: string;
}

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  allowedRoles: string[];
}
