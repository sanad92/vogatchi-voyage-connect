
import {
  Home,
  Calendar,
  Users,
  Building,
  Plane,
  Truck,
  DollarSign,
  FileText,
  CreditCard,
  BarChart,
  TrendingUp,
  Headphones,
  Settings,
  Car as CarIcon,
  type LucideIcon
} from "lucide-react";

interface NavigationItem {
  title: string;
  to: string;
  icon: LucideIcon;
  label?: string;
  allowedRoles?: string[];
}

// العمليات الرئيسية
export const mainNavItems: NavigationItem[] = [
  {
    title: "الصفحة الرئيسية",
    to: "/",
    icon: Home,
    label: "الصفحة الرئيسية",
    allowedRoles: []
  },
  {
    title: "العمليات اليومية",
    to: "/daily-operations",
    icon: Calendar,
    label: "العمليات اليومية",
    allowedRoles: []
  }
];

// إدارة الأعمال
export const businessNavItems: NavigationItem[] = [
  {
    title: "العملاء",
    to: "/customers",
    icon: Users,
    label: "العملاء",
    allowedRoles: []
  },
  {
    title: "حجوزات الفنادق",
    to: "/hotel-bookings",
    icon: Building,
    label: "حجوزات الفنادق",
    allowedRoles: []
  },
  {
    title: "حجوزات الطيران",
    to: "/flight-bookings",
    icon: Plane,
    label: "حجوزات الطيران",
    allowedRoles: []
  },
  {
    title: "حجوزات النقل",
    to: "/transport-bookings",
    icon: CarIcon,
    label: "حجوزات النقل",
    allowedRoles: []
  },
  {
    title: "إيجار السيارات",
    to: "/car-rentals",
    icon: CarIcon,
    label: "إيجار السيارات",
    allowedRoles: []
  },
  {
    title: "الموردين",
    to: "/suppliers",
    icon: Truck,
    label: "الموردين",
    allowedRoles: []
  },
  {
    title: "الفواتير",
    to: "/invoices",
    icon: FileText,
    label: "الفواتير",
    allowedRoles: []
  },
  {
    title: "أوامر الدفع",
    to: "/payment-orders",
    icon: CreditCard,
    label: "أوامر الدفع",
    allowedRoles: []
  },
  {
    title: "الحسابات البنكية",
    to: "/bank-accounts",
    icon: Building,
    label: "الحسابات البنكية",
    allowedRoles: []
  },
  {
    title: "إدارة المصروفات",
    to: "/expense-management",
    icon: DollarSign,
    label: "إدارة المصروفات",
    allowedRoles: []
  }
];

// التواصل والتقارير
export const communicationNavItems: NavigationItem[] = [
  {
    title: "التقارير",
    to: "/reports",
    icon: BarChart,
    label: "التقارير",
    allowedRoles: []
  },
  {
    title: "تقارير الأرباح والخسائر",
    to: "/profit-loss-reports",
    icon: TrendingUp,
    label: "تقارير الأرباح والخسائر",
    allowedRoles: []
  },
  {
    title: "تقويم الحجوزات",
    to: "/bookings-calendar",
    icon: Calendar,
    label: "تقويم الحجوزات",
    allowedRoles: []
  },
  {
    title: "إدارة علاقات العملاء",
    to: "/crm",
    icon: Users,
    label: "إدارة علاقات العملاء",
    allowedRoles: []
  },
  {
    title: "خدمة العملاء",
    to: "/customer-service",
    icon: Headphones,
    label: "خدمة العملاء",
    allowedRoles: []
  }
];

// إعدادات النظام
export const adminNavItems: NavigationItem[] = [
  {
    title: "إعدادات النظام",
    to: "/admin",
    icon: Settings,
    label: "إعدادات النظام",
    allowedRoles: []
  }
];

// للتوافق مع الكود الموجود
export const navigationItems = [
  ...mainNavItems,
  ...businessNavItems,
  ...communicationNavItems,
  ...adminNavItems
];
