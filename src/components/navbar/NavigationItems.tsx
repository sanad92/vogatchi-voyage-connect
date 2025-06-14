import { Home, Calendar, Users, Package, CreditCard, FileText, Settings, MessageSquare, Hotel, Plane } from "lucide-react";

export const mainNavItems = [
  {
    name: "الرئيسية",
    href: "/",
    icon: Home,
  },
  {
    name: "العمليات اليومية",
    href: "/daily-operations",
    icon: Calendar,
  },
];

export const businessNavItems = [
  {
    name: "العملاء",
    href: "/customers",
    icon: Users,
  },
  {
    name: "حجوزات الفنادق",
    href: "/hotel-bookings",
    icon: Hotel,
  },
  {
    name: "حجوزات الطيران",
    href: "/flight-bookings",
    icon: Plane,
  },
  {
    name: "الحجوزات",
    href: "/bookings",
    icon: Calendar,
  },
  {
    name: "الرحلات",
    href: "/trips",
    icon: Package,
  },
  {
    name: "الموردين",
    href: "/suppliers",
    icon: Package,
  },
  {
    name: "الفواتير",
    href: "/invoices",
    icon: FileText,
  },
  {
    name: "أوامر الدفع",
    href: "/payment-orders",
    icon: CreditCard,
  },
  {
    name: "تسعير العملاء",
    href: "/customer-pricing",
    icon: CreditCard,
  },
];

export const communicationNavItems = [
  {
    name: "خدمة العملاء",
    href: "/customer-service",
    icon: MessageSquare,
  },
  {
    name: "التقارير",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "واتساب",
    href: "/whatsapp",
    icon: MessageSquare,
  },
];

export const adminNavItems = [
  {
    name: "الموظفين",
    href: "/employees",
    icon: Users,
  },
  {
    name: "إعدادات النظام",
    href: "/admin-settings",
    icon: Settings,
  },
];

// Keep the original navigationItems for backwards compatibility
export const navigationItems = [
  ...mainNavItems,
  ...businessNavItems,
  ...communicationNavItems,
  ...adminNavItems,
];
