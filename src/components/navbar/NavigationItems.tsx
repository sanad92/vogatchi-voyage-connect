
import { 
  Home, 
  Users, 
  Calendar, 
  Building2, 
  Receipt, 
  FileText, 
  BarChart3, 
  Settings,
  Plane,
  Car,
  MapPin,
  Hotel,
  CreditCard,
  UserCheck,
  Target,
  Phone,
} from 'lucide-react';

export interface SimpleNavItem {
  to: string;
  icon: any;
  label: string;
  allowedRoles: string[];
  requiredPermissions?: string[];
}

export const mainNavItems: SimpleNavItem[] = [
  {
    to: "/",
    icon: Home,
    label: "الرئيسية",
    allowedRoles: [],
    requiredPermissions: []
  },
  {
    to: "/daily-operations",
    icon: Calendar,
    label: "العمليات اليومية",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  }
];

export const businessNavItems: SimpleNavItem[] = [
  {
    to: "/customers",
    icon: UserCheck,
    label: "العملاء",
    allowedRoles: [],
    requiredPermissions: ['customers_view']
  },
  {
    to: "/hotel-bookings",
    icon: Hotel,
    label: "حجوزات الفنادق",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/flight-bookings",
    icon: Plane,
    label: "حجوزات الطيران",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/transport-bookings",
    icon: MapPin,
    label: "حجوزات النقل",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/car-rentals",
    icon: Car,
    label: "تأجير السيارات",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/suppliers",
    icon: Building2,
    label: "الموردين",
    allowedRoles: [],
    requiredPermissions: ['suppliers_view']
  },
  {
    to: "/employees",
    icon: Users,
    label: "الموظفين",
    allowedRoles: [],
    requiredPermissions: ['employees_view']
  },
  {
    to: "/expense-management",
    icon: Receipt,
    label: "إدارة المصروفات",
    allowedRoles: [],
    requiredPermissions: ['expenses_view']
  },
  {
    to: "/bank-accounts",
    icon: CreditCard,
    label: "الحسابات البنكية",
    allowedRoles: [],
    requiredPermissions: ['banking_view']
  },
  {
    to: "/invoices",
    icon: FileText,
    label: "الفواتير",
    allowedRoles: [],
    requiredPermissions: ['invoices_view']
  }
];

export const communicationNavItems: SimpleNavItem[] = [
  {
    to: "/reports",
    icon: BarChart3,
    label: "التقارير",
    allowedRoles: [],
    requiredPermissions: ['reports_financial', 'reports_sales', 'reports_operational']
  },
  {
    to: "/crm",
    icon: Target,
    label: "إدارة العملاء",
    allowedRoles: [],
    requiredPermissions: ['customers_view']
  },
  {
    to: "/customer-service",
    icon: Phone,
    label: "خدمة العملاء",
    allowedRoles: [],
    requiredPermissions: ['customers_view']
  }
];

export const adminNavItems: SimpleNavItem[] = [
  {
    to: "/admin-settings",
    icon: Settings,
    label: "إعدادات النظام",
    allowedRoles: ['super_admin'],
    requiredPermissions: ['system_settings']
  }
];
