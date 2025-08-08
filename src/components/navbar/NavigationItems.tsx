
import { 
  Home, 
  Users, 
  Plane, 
  Hotel, 
  Car, 
  Bus,
  Receipt, 
  Truck, 
  BarChart3, 
  DollarSign,
  FileSpreadsheet,
  Briefcase,
  Settings,
  UserCog,
  Database,
  Upload,
  Palette,
  CreditCard,
  Banknote,
  Calendar,
  Headphones,
  Target,
  BarChart,
  Globe,
  Calendar as CalendarIcon,
  MessageSquare,
  Shield,
  LandPlot
} from "lucide-react";

export interface SimpleNavItem {
  to: string;
  icon: any;
  label: string;
  allowedRoles?: string[];
  requiredPermissions?: string[];
}

export const mainNavItems: SimpleNavItem[] = [
  {
    to: "/dashboard",
    icon: Home,
    label: "لوحة التحكم",
    allowedRoles: [],
    requiredPermissions: []
  }
];

export const businessNavItems: SimpleNavItem[] = [
  {
    to: "/daily-operations",
    icon: Calendar,
    label: "العمليات اليومية",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/customers",
    icon: Users,
    label: "العملاء",
    allowedRoles: [],
    requiredPermissions: ['customers_view']
  },
  {
    to: "/duplicate-customers",
    icon: Users,
    label: "العملاء المكررين",
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
    to: "/car-rentals",
    icon: Car,
    label: "تأجير السيارات",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/transport-bookings",
    icon: Bus,
    label: "النقل والمواصلات",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/invoices",
    icon: Receipt,
    label: "الفواتير",
    allowedRoles: [],
    requiredPermissions: ['invoices_view']
  },
  {
    to: "/suppliers",
    icon: Truck,
    label: "الموردين",
    allowedRoles: [],
    requiredPermissions: ['suppliers_view']
  },
  {
    to: "/expense-management-enhanced",
    icon: DollarSign,
    label: "إدارة المصروفات",
    allowedRoles: [],
    requiredPermissions: ['expenses_view']
  },
  {
    to: "/employees-enhanced",
    icon: Briefcase,
    label: "الموظفين",
    allowedRoles: [],
    requiredPermissions: ['employees_view']
  },
  {
    to: "/bank-accounts",
    icon: Banknote,
    label: "الحسابات البنكية",
    allowedRoles: [],
    requiredPermissions: ['financial_view']
  },
  {
    to: "/payment-orders",
    icon: CreditCard,
    label: "أوامر الدفع",
    allowedRoles: [],
    requiredPermissions: ['financial_view']
  }
];

export const communicationNavItems: SimpleNavItem[] = [
  {
    to: "/reports",
    icon: BarChart3,
    label: "التقارير",
    allowedRoles: [],
    requiredPermissions: ['reports_view']
  },
  {
    to: "/profit-loss-reports",
    icon: FileSpreadsheet,
    label: "تقارير الأرباح والخسائر",
    allowedRoles: [],
    requiredPermissions: ['reports_view']
  },
  {
    to: "/customer-service",
    icon: Headphones,
    label: "خدمة العملاء",
    allowedRoles: [],
    requiredPermissions: ['customer_service_view']
  },
  {
    to: "/crm",
    icon: Target,
    label: "إدارة علاقات العملاء",
    allowedRoles: [],
    requiredPermissions: ['crm_view']
  },
  {
    to: "/crm-dashboard",
    icon: BarChart,
    label: "لوحة تحكم CRM",
    allowedRoles: [],
    requiredPermissions: ['crm_view']
  },
  {
    to: "/customer-portal",
    icon: Globe,
    label: "بوابة العملاء",
    allowedRoles: [],
    requiredPermissions: ['customer_portal_view']
  },
  {
    to: "/bookings-calendar",
    icon: CalendarIcon,
    label: "تقويم الحجوزات",
    allowedRoles: [],
    requiredPermissions: ['bookings_view']
  },
  {
    to: "/whatsapp",
    icon: MessageSquare,
    label: "واتساب",
    allowedRoles: [],
    requiredPermissions: ['whatsapp_view']
  },
  {
    to: "/whatsapp-admin",
    icon: Shield,
    label: "إدارة واتساب",
    allowedRoles: [],
    requiredPermissions: ['whatsapp_admin']
  }
];

export const adminNavItems: SimpleNavItem[] = [
  {
    to: "/admin-settings",
    icon: Settings,
    label: "إعدادات النظام",
    allowedRoles: ['super_admin'],
    requiredPermissions: ['admin_settings']
  },
  {
    to: "/landing-admin",
    icon: LandPlot,
    label: "إدارة صفحة الهبوط",
    allowedRoles: ['super_admin'],
    requiredPermissions: ['admin_settings']
  },
  {
    to: "/admin-import-export",
    icon: Upload,
    label: "استيراد وتصدير البيانات",
    allowedRoles: ['super_admin'],
    requiredPermissions: ['admin_settings']
  },
  {
    to: "/site-customization",
    icon: Palette,
    label: "تخصيص الموقع",
    allowedRoles: ['super_admin'],
    requiredPermissions: ['admin_settings']
  },
  {
    to: "/database-manager",
    icon: Database,
    label: "إدارة قاعدة البيانات",
    allowedRoles: ['super_admin'],
    requiredPermissions: ['admin_settings']
  }
];
