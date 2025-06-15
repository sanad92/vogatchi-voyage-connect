
import { Calendar, FileText, Home, Users, CreditCard, Banknote, Settings, BarChart3, UserCheck, Receipt } from 'lucide-react';
import type { NavigationItem } from './types';

export const navigationItems: NavigationItem[] = [
  {
    title: 'الرئيسية',
    icon: Home,
    path: '/',
  },
  {
    title: 'العمليات اليومية',
    icon: Calendar,
    path: '/daily-operations',
  },
  {
    title: 'العملاء',
    icon: Users,
    path: '/customers',
  },
  {
    title: 'حجوزات الفنادق',
    icon: FileText,
    path: '/hotel-bookings',
  },
  {
    title: 'حجوزات الطيران',
    icon: FileText,
    path: '/flight-bookings',
  },
  {
    title: 'الموردين',
    icon: UserCheck,
    path: '/suppliers',
  },
  {
    title: 'الفواتير',
    icon: FileText,
    path: '/invoices',
  },
  {
    title: 'أوامر الدفع',
    icon: CreditCard,
    path: '/payment-orders',
  },
  {
    title: 'الحسابات البنكية',
    icon: Banknote,
    path: '/bank-accounts',
  },
  {
    title: 'إدارة المصروفات',
    icon: Receipt,
    path: '/expense-management',
  },
  {
    title: 'نظام CRM',
    icon: Users,
    path: '/crm',
  },
  {
    title: 'خدمة العملاء',
    icon: UserCheck,
    path: '/customer-service',
  },
  {
    title: 'التقارير',
    icon: BarChart3,
    path: '/reports',
  },
  {
    title: 'إدارة النظام',
    icon: Settings,
    path: '/admin',
  },
];
