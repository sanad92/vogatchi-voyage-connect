
import { Home, Calendar, Users, Package, CreditCard, FileText, Settings, MessageSquare, Hotel, Plane } from "lucide-react";

export const navigationItems = [
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
