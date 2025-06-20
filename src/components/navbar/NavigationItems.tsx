import {
  Home,
  Users,
  UserPlus,
  Building2,
  Plus,
  Plane,
  Car,
  Bus,
  FileText,
  Truck,
  BarChart3,
  TrendingUp,
  DollarSign,
  CreditCard,
  UserCog,
  Settings,
  Upload,
  Palette,
  Banknote,
  Calendar,
  Globe,
  Headphones,
  BarChart,
  Database,
  MessageCircle
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  permission?: string;
}

interface NavigationSection {
  title: string;
  items: NavItem[];
}

export const navigationItems: NavigationSection[] = [
  {
    title: "لوحة التحكم",
    items: [
      { name: "الرئيسية", href: "/", icon: Home },
      { name: "العمليات اليومية", href: "/daily-operations", icon: Calendar },
    ]
  },
  {
    title: "إدارة العملاء",
    items: [
      { name: "العملاء", href: "/customers", icon: Users, permission: "customers_view" },
      { name: "عميل جديد", href: "/new-customer", icon: UserPlus, permission: "customers_create" },
      { name: "بوابة العميل", href: "/customer-portal", icon: Globe },
      { name: "WhatsApp", href: "/whatsapp", icon: MessageCircle, permission: "customers_view" },
    ]
  },
  {
    title: "الحجوزات",
    items: [
      { name: "حجوزات الفنادق", href: "/hotel-bookings", icon: Building2, permission: "hotel_bookings_view" },
      { name: "حجز فندق جديد", href: "/new-hotel-booking", icon: Plus, permission: "hotel_bookings_create" },
      { name: "حجوزات الطيران", href: "/flight-bookings", icon: Plane, permission: "flight_bookings_view" },
      { name: "حجز طيران جديد", href: "/new-flight-booking", icon: Plus, permission: "flight_bookings_create" },
      { name: "تأجير السيارات", href: "/car-rentals", icon: Car, permission: "car_rentals_view" },
      { name: "حجوزات النقل", href: "/transport-bookings", icon: Bus, permission: "transport_bookings_view" },
      { name: "تقويم الحجوزات", href: "/bookings-calendar", icon: Calendar, permission: "hotel_bookings_view" },
    ]
  },
  {
    title: "المالية",
    items: [
      { name: "الفواتير", href: "/invoices", icon: FileText, permission: "invoices_view" },
      { name: "إدارة المصروفات", href: "/expense-management-enhanced", icon: Truck, permission: "expenses_view" },
      { name: "أوامر الدفع", href: "/payment-orders", icon: CreditCard, permission: "payment_orders_view" },
      { name: "الحسابات البنكية", href: "/bank-accounts", icon: Banknote, permission: "bank_accounts_view" },
    ]
  },
  {
    title: "التقارير",
    items: [
      { name: "نظرة عامة", href: "/reports", icon: BarChart3, permission: "reports_view" },
      { name: "الأرباح والخسائر", href: "/profit-loss-reports", icon: TrendingUp, permission: "reports_view" },
    ]
  },
  {
    title: "إدارة الموردين",
    items: [
      { name: "الموردين", href: "/suppliers", icon: Truck, permission: "suppliers_view" },
    ]
  },
  {
    title: "إدارة الموظفين",
    items: [
      { name: "الموظفين", href: "/employees-enhanced", icon: UserCog, permission: "employees_view" },
    ]
  },
  {
    title: "إعدادات النظام",
    items: [
      { name: "إعدادات المسؤول", href: "/admin-settings", icon: Settings, permission: "admin_settings_view" },
      { name: "استيراد وتصدير", href: "/admin-import-export", icon: Upload, permission: "admin_settings_view" },
      { name: "تخصيص الموقع", href: "/site-customization", icon: Palette, permission: "admin_settings_view" },
      { name: "إدارة قواعد البيانات", href: "/database-manager", icon: Database, permission: "super_admin" },
    ]
  },
];
