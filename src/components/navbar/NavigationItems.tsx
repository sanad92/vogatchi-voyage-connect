
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
  Car as CarIcon
} from "lucide-react";

interface NavigationItem {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

// العمليات الرئيسية
export const mainNavItems: NavigationItem[] = [
  {
    title: "الصفحة الرئيسية",
    to: "/",
    icon: Home
  },
  {
    title: "العمليات اليومية",
    to: "/daily-operations",
    icon: Calendar
  }
];

// إدارة الأعمال
export const businessNavItems: NavigationItem[] = [
  {
    title: "العملاء",
    to: "/customers",
    icon: Users
  },
  {
    title: "حجوزات الفنادق",
    to: "/hotel-bookings",
    icon: Building
  },
  {
    title: "حجوزات الطيران",
    to: "/flight-bookings",
    icon: Plane
  },
  {
    title: "حجوزات النقل",
    to: "/transport-bookings",
    icon: CarIcon
  },
  {
    title: "إيجار السيارات",
    to: "/car-rentals",
    icon: CarIcon
  },
  {
    title: "الموردين",
    to: "/suppliers",
    icon: Truck
  },
  {
    title: "الفواتير",
    to: "/invoices",
    icon: FileText
  },
  {
    title: "أوامر الدفع",
    to: "/payment-orders",
    icon: CreditCard
  },
  {
    title: "الحسابات البنكية",
    to: "/bank-accounts",
    icon: Building
  },
  {
    title: "إدارة المصروفات",
    to: "/expense-management",
    icon: DollarSign
  }
];

// التواصل والتقارير
export const communicationNavItems: NavigationItem[] = [
  {
    title: "التقارير",
    to: "/reports",
    icon: BarChart
  },
  {
    title: "تقارير الأرباح والخسائر",
    to: "/profit-loss-reports",
    icon: TrendingUp
  },
  {
    title: "تقويم الحجوزات",
    to: "/bookings-calendar",
    icon: Calendar
  },
  {
    title: "إدارة علاقات العملاء",
    to: "/crm",
    icon: Users
  },
  {
    title: "خدمة العملاء",
    to: "/customer-service",
    icon: Headphones
  }
];

// إعدادات النظام
export const adminNavItems: NavigationItem[] = [
  {
    title: "إعدادات النظام",
    to: "/admin",
    icon: Settings
  }
];

// للتوافق مع الكود الموجود
export const navigationItems = [
  ...mainNavItems,
  ...businessNavItems,
  ...communicationNavItems,
  ...adminNavItems
];
