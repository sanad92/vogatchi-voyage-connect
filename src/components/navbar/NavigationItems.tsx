
import { 
  Home, 
  Calendar, 
  Users, 
  Calendar as BookingIcon, 
  Truck, 
  MapPin, 
  FileText, 
  CreditCard, 
  DollarSign, 
  BarChart3, 
  UserCheck, 
  MessageSquare, 
  Headphones,
  Settings
} from "lucide-react";

export const mainNavItems = [
  { name: "الرئيسية", href: "/", icon: Home },
  { name: "العمليات اليومية", href: "/daily-operations", icon: Calendar },
];

export const businessNavItems = [
  { name: "العملاء", href: "/customers", icon: Users },
  { name: "الحجوزات", href: "/bookings", icon: BookingIcon },
  { name: "الموردين", href: "/suppliers", icon: Truck },
  { name: "الرحلات", href: "/trips", icon: MapPin },
  { name: "الفواتير", href: "/invoices", icon: FileText },
  { name: "أوامر الدفع", href: "/payment-orders", icon: CreditCard },
  { name: "تسعير العملاء", href: "/customer-pricing", icon: DollarSign },
  { name: "التقارير", href: "/reports", icon: BarChart3 },
  { name: "الموظفين", href: "/employees", icon: UserCheck },
];

export const communicationNavItems = [
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
  { name: "خدمة العملاء", href: "/customer-service", icon: Headphones },
];

export const adminNavItems = [
  { name: "إعدادات النظام", href: "/admin-settings", icon: Settings },
];
