
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
  Briefcase,
  PiggyBank,
  Calculator,
  CreditCard,
  UserCheck,
  Target,
  TrendingUp,
  MessageSquare,
  Phone,
  UserCog,
  Shield
} from 'lucide-react';

export interface NavigationItem {
  name: string;
  nameEn: string;
  href: string;
  icon: any;
  children?: NavigationItem[];
}

// Simple navigation item type for new structure
export interface SimpleNavItem {
  to: string;
  icon: any;
  label: string;
  allowedRoles: string[];
}

export const navigationItems: NavigationItem[] = [
  {
    name: 'لوحة التحكم',
    nameEn: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    name: 'العملاء',
    nameEn: 'Customers',
    href: '/customers',
    icon: UserCheck,
  },
  {
    name: 'الحجوزات',
    nameEn: 'Bookings',
    href: '/bookings',
    icon: Calendar,
    children: [
      {
        name: 'الفنادق',
        nameEn: 'Hotels',
        href: '/bookings/hotels',
        icon: Hotel,
      },
      {
        name: 'الطيران',
        nameEn: 'Flights',
        href: '/bookings/flights',
        icon: Plane,
      },
      {
        name: 'المواصلات',
        nameEn: 'Transport',
        href: '/bookings/transport',
        icon: MapPin,
      },
      {
        name: 'تأجير سيارات',
        nameEn: 'Car Rental',
        href: '/bookings/car-rental',
        icon: Car,
      },
    ],
  },
  {
    name: 'الموردين',
    nameEn: 'Suppliers',
    href: '/suppliers',
    icon: Building2,
  },
  {
    name: 'الموظفين',
    nameEn: 'Employees', 
    href: '/employees',
    icon: Users,
  },
  {
    name: 'المصروفات',
    nameEn: 'Expenses',
    href: '/expenses',
    icon: Receipt,
    children: [
      {
        name: 'فئات المصروفات',
        nameEn: 'Expense Categories',
        href: '/expenses/categories',
        icon: FileText,
      },
      {
        name: 'المعاملات',
        nameEn: 'Transactions',
        href: '/expenses/transactions',
        icon: CreditCard,
      },
      {
        name: 'الرواتب',
        nameEn: 'Salaries',
        href: '/expenses/salaries',
        icon: PiggyBank,
      },
      {
        name: 'العقارات',
        nameEn: 'Properties',
        href: '/expenses/properties',
        icon: Briefcase,
      },
      {
        name: 'التقارير',
        nameEn: 'Reports',
        href: '/expenses/reports',
        icon: Calculator,
      },
    ],
  },
  {
    name: 'الفواتير',
    nameEn: 'Invoices',
    href: '/invoices',
    icon: FileText,
  },
  {
    name: 'التقارير',
    nameEn: 'Reports',
    href: '/reports',
    icon: BarChart3,
  },
  {
    name: 'إدارة النظام',
    nameEn: 'Admin Settings',
    href: '/admin-settings',
    icon: Settings,
    children: [
      {
        name: 'إدارة المستخدمين',
        nameEn: 'User Management',
        href: '/admin-settings/users',
        icon: UserCog,
      },
      {
        name: 'إدارة الأدوار',
        nameEn: 'Role Management',
        href: '/admin-settings/roles',
        icon: Shield,
      },
      {
        name: 'سجل العمليات',
        nameEn: 'Activity Log',
        href: '/admin-settings/activity-log',
        icon: MessageSquare,
      },
    ],
  },
];

// Export grouped navigation items for enhanced navigation
export const mainNavItems: SimpleNavItem[] = [
  {
    to: "/",
    icon: Home,
    label: "الرئيسية",
    allowedRoles: []
  },
  {
    to: "/daily-operations",
    icon: Calendar,
    label: "العمليات اليومية",
    allowedRoles: []
  }
];

export const businessNavItems: SimpleNavItem[] = [
  {
    to: "/customers",
    icon: UserCheck,
    label: "العملاء",
    allowedRoles: []
  },
  {
    to: "/hotel-bookings",
    icon: Hotel,
    label: "حجوزات الفنادق",
    allowedRoles: []
  },
  {
    to: "/flight-bookings",
    icon: Plane,
    label: "حجوزات الطيران",
    allowedRoles: []
  },
  {
    to: "/transport-bookings",
    icon: MapPin,
    label: "حجوزات النقل",
    allowedRoles: []
  },
  {
    to: "/car-rentals",
    icon: Car,
    label: "تأجير السيارات",
    allowedRoles: []
  },
  {
    to: "/suppliers",
    icon: Building2,
    label: "الموردين",
    allowedRoles: []
  },
  {
    to: "/employees",
    icon: Users,
    label: "الموظفين",
    allowedRoles: []
  },
  {
    to: "/expense-management",
    icon: Receipt,
    label: "إدارة المصروفات",
    allowedRoles: []
  },
  {
    to: "/invoices",
    icon: FileText,
    label: "الفواتير",
    allowedRoles: []
  }
];

export const communicationNavItems: SimpleNavItem[] = [
  {
    to: "/reports",
    icon: BarChart3,
    label: "التقارير",
    allowedRoles: []
  },
  {
    to: "/crm",
    icon: Target,
    label: "إدارة العملاء",
    allowedRoles: []
  },
  {
    to: "/customer-service",
    icon: Phone,
    label: "خدمة العملاء",
    allowedRoles: []
  }
];

export const adminNavItems: SimpleNavItem[] = [
  {
    to: "/admin",
    icon: Settings,
    label: "إعدادات النظام",
    allowedRoles: ['super_admin']
  }
];
