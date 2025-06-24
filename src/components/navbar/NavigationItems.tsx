
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
  MessageCircle,
  LucideIcon
} from "lucide-react";

export interface SimpleNavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  allowedRoles: string[];
  requiredPermissions?: string[];
}

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavigationSection {
  title: string;
  items: NavItem[];
}

// Main navigation items
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
  },
];

// Business navigation items
export const businessNavItems: SimpleNavItem[] = [
  { 
    to: "/customers", 
    icon: Users, 
    label: "العملاء", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['customers_view']
  },
  { 
    to: "/new-customer", 
    icon: UserPlus, 
    label: "عميل جديد", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['customers_create']
  },
  { 
    to: "/hotel-bookings", 
    icon: Building2, 
    label: "حجوزات الفنادق", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['bookings_view']
  },
  { 
    to: "/flight-bookings", 
    icon: Plane, 
    label: "حجوزات الطيران", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['bookings_view']
  },
  { 
    to: "/car-rentals", 
    icon: Car, 
    label: "تأجير السيارات", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['bookings_view']
  },
  { 
    to: "/transport-bookings", 
    icon: Bus, 
    label: "حجوزات النقل", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['bookings_view']
  },
  { 
    to: "/suppliers", 
    icon: Truck, 
    label: "الموردين", 
    allowedRoles: ['admin', 'manager'],
    requiredPermissions: ['suppliers_view']
  },
  { 
    to: "/invoices", 
    icon: FileText, 
    label: "الفواتير", 
    allowedRoles: ['admin', 'manager', 'accountant'],
    requiredPermissions: ['invoices_view']
  },
  { 
    to: "/expense-management-enhanced", 
    icon: DollarSign, 
    label: "إدارة المصروفات", 
    allowedRoles: ['admin', 'manager', 'accountant'],
    requiredPermissions: ['expenses_view']
  },
  { 
    to: "/payment-orders", 
    icon: CreditCard, 
    label: "أوامر الدفع", 
    allowedRoles: ['admin', 'manager', 'accountant'],
    requiredPermissions: ['banking_view']
  },
  { 
    to: "/bank-accounts", 
    icon: Banknote, 
    label: "الحسابات البنكية", 
    allowedRoles: ['admin', 'manager', 'accountant'],
    requiredPermissions: ['banking_view']
  },
];

// Communication and reports navigation
export const communicationNavItems: SimpleNavItem[] = [
  { 
    to: "/whatsapp", 
    icon: MessageCircle, 
    label: "WhatsApp", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['customers_view']
  },
  { 
    to: "/whatsapp-admin", 
    icon: Settings, 
    label: "إدارة WhatsApp Business", 
    allowedRoles: ['admin', 'manager'],
    requiredPermissions: ['system_settings']
  },
  { 
    to: "/customer-portal", 
    icon: Globe, 
    label: "بوابة العميل", 
    allowedRoles: [],
    requiredPermissions: []
  },
  { 
    to: "/customer-service", 
    icon: Headphones, 
    label: "خدمة العملاء", 
    allowedRoles: ['admin', 'manager', 'sales_agent'],
    requiredPermissions: ['customers_view']
  },
  { 
    to: "/reports", 
    icon: BarChart3, 
    label: "التقارير", 
    allowedRoles: ['admin', 'manager', 'accountant'],
    requiredPermissions: ['reports_view']
  },
  { 
    to: "/profit-loss-reports", 
    icon: TrendingUp, 
    label: "الأرباح والخسائر", 
    allowedRoles: ['admin', 'manager', 'accountant'],
    requiredPermissions: ['reports_view']
  },
  { 
    to: "/employees-enhanced", 
    icon: UserCog, 
    label: "الموظفين", 
    allowedRoles: ['admin', 'manager'],
    requiredPermissions: ['employees_view']
  },
];

// Admin navigation items
export const adminNavItems: SimpleNavItem[] = [
  { 
    to: "/admin-settings", 
    icon: Settings, 
    label: "إعدادات المسؤول", 
    allowedRoles: ['super_admin'],
    requiredPermissions: ['system_settings']
  },
  { 
    to: "/admin-import-export", 
    icon: Upload, 
    label: "استيراد وتصدير", 
    allowedRoles: ['super_admin'],
    requiredPermissions: ['system_settings']
  },
  { 
    to: "/site-customization", 
    icon: Palette, 
    label: "تخصيص الموقع", 
    allowedRoles: ['super_admin'],
    requiredPermissions: ['system_settings']
  },
  { 
    to: "/database-manager", 
    icon: Database, 
    label: "إدارة قواعد البيانات", 
    allowedRoles: ['super_admin'],
    requiredPermissions: ['system_settings']
  },
];

// Legacy navigation sections for backward compatibility
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
