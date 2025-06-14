
import { 
  Home, 
  Users, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Building,
  CreditCard,
  BarChart3,
  ClipboardList
} from "lucide-react";

export const mainNavItems = [
  { name: "الرئيسية", href: "/", icon: Home },
  { name: "العمليات اليومية", href: "/daily-operations", icon: ClipboardList },
  { name: "العملاء", href: "/customers", icon: Users },
  { name: "الحجوزات", href: "/bookings", icon: Calendar },
  { name: "خدمة العملاء", href: "/customer-service", icon: MessageSquare },
];

export const businessNavItems = [
  { name: "الموردين", href: "/suppliers", icon: Building },
  { name: "الرحلات", href: "/trips", icon: Calendar },
  { name: "الفواتير", href: "/invoices", icon: FileText },
  { name: "أوامر الدفع", href: "/payment-orders", icon: CreditCard },
  { name: "تسعير العملاء", href: "/customer-pricing", icon: BarChart3 },
];

export const communicationNavItems = [
  { name: "واتساب", href: "/whatsapp", icon: MessageSquare },
  { name: "التقارير", href: "/reports", icon: BarChart3 },
  { name: "الموظفين", href: "/employees", icon: Users },
];
