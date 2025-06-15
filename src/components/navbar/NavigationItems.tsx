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
  href?: string;
  icon: string;
  subItems?: NavigationItem[];
}

export const navigationItems: NavigationItem[] = [
  {
    title: "الصفحة الرئيسية",
    href: "/",
    icon: "home"
  },
  {
    title: "العمليات اليومية",
    href: "/daily-operations",
    icon: "calendar"
  },
  {
    title: "العملاء",
    href: "/customers",
    icon: "users"
  },
  {
    title: "الحجوزات",
    icon: "calendar",
    subItems: [
      {
        title: "حجوزات الفنادق",
        href: "/hotel-bookings",
        icon: "building"
      },
      {
        title: "حجوزات الطيران",
        href: "/flight-bookings",
        icon: "plane"
      },
      {
        title: "حجوزات النقل",
        href: "/transport-bookings",
        icon: "car"
      },
      {
        title: "إيجار السيارات",
        href: "/car-rentals",
        icon: "car"
      }
    ]
  },
  {
    title: "الموردين",
    href: "/suppliers",
    icon: "truck"
  },
  {
    title: "المالية",
    icon: "dollarSign",
    subItems: [
      {
        title: "الفواتير",
        href: "/invoices",
        icon: "fileText"
      },
      {
        title: "أوامر الدفع",
        href: "/payment-orders",
        icon: "creditCard"
      },
      {
        title: "الحسابات البنكية",
        href: "/bank-accounts",
        icon: "building"
      },
      {
        title: "إدارة المصروفات",
        href: "/expense-management",
        icon: "dollarSign"
      }
    ]
  },
  {
    title: "التقارير",
    icon: "barChart",
    subItems: [
      {
        title: "التقارير العامة",
        href: "/reports",
        icon: "barChart"
      },
      {
        title: "تقارير الأرباح والخسائر",
        href: "/profit-loss-reports",
        icon: "trendingUp"
      }
    ]
  },
  {
    title: "تقويم الحجوزات",
    href: "/bookings-calendar",
    icon: "calendar"
  },
  {
    title: "إدارة علاقات العملاء",
    href: "/crm",
    icon: "users"
  },
  {
    title: "خدمة العملاء",
    href: "/customer-service",
    icon: "headphones"
  },
  {
    title: "إعدادات النظام",
    href: "/admin",
    icon: "settings"
  }
];
