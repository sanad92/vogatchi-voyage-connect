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
