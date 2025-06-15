
import { Calendar, FileText, Home, Users, CreditCard, Banknote, Settings, BarChart3, UserCheck, Receipt } from 'lucide-react';
import type { NavItem } from './types';

export const navigationItems: NavItem[] = [
  {
    label: 'الرئيسية',
    icon: Home,
    to: '/',
    allowedRoles: ['super_admin', 'admin', 'manager', 'sales_agent', 'accountant', 'viewer'],
  },
  {
    label: 'العمليات اليومية',
    icon: Calendar,
    to: '/daily-operations',
    allowedRoles: ['super_admin', 'admin', 'manager', 'sales_agent'],
  },
  {
    label: 'العملاء',
    icon: Users,
    to: '/customers',
    allowedRoles: ['super_admin', 'admin', 'manager', 'sales_agent'],
  },
  {
    label: 'حجوزات الفنادق',
    icon: FileText,
    to: '/hotel-bookings',
    allowedRoles: ['super_admin', 'admin', 'manager', 'sales_agent'],
  },
  {
    label: 'حجوزات الطيران',
    icon: FileText,
    to: '/flight-bookings',
    allowedRoles: ['super_admin', 'admin', 'manager', 'sales_agent'],
  },
  {
    label: 'الموردين',
    icon: UserCheck,
    to: '/suppliers',
    allowedRoles: ['super_admin', 'admin', 'manager'],
  },
  {
    label: 'الفواتير',
    icon: FileText,
    to: '/invoices',
    allowedRoles: ['super_admin', 'admin', 'manager', 'accountant'],
  },
  {
    label: 'أوامر الدفع',
    icon: CreditCard,
    to: '/payment-orders',
    allowedRoles: ['super_admin', 'admin', 'manager', 'accountant'],
  },
  {
    label: 'الحسابات البنكية',
    icon: Banknote,
    to: '/bank-accounts',
    allowedRoles: ['super_admin', 'admin', 'manager', 'accountant'],
  },
  {
    label: 'إدارة المصروفات',
    icon: Receipt,
    to: '/expense-management',
    allowedRoles: ['super_admin', 'admin', 'manager', 'accountant'],
  },
  {
    label: 'نظام CRM',
    icon: Users,
    to: '/crm',
    allowedRoles: ['super_admin', 'admin', 'manager', 'sales_agent'],
  },
  {
    label: 'خدمة العملاء',
    icon: UserCheck,
    to: '/customer-service',
    allowedRoles: ['super_admin', 'admin', 'manager', 'sales_agent'],
  },
  {
    label: 'التقارير',
    icon: BarChart3,
    to: '/reports',
    allowedRoles: ['super_admin', 'admin', 'manager', 'accountant'],
  },
  {
    label: 'إدارة النظام',
    icon: Settings,
    to: '/admin',
    allowedRoles: ['super_admin'],
  },
];

// تصدير المجموعات المختلفة للتوافق مع الملفات الموجودة
export const mainNavItems = navigationItems.slice(0, 4);
export const businessNavItems = navigationItems.slice(4, 10);
export const communicationNavItems = navigationItems.slice(10, 13);
export const adminNavItems = navigationItems.slice(13);
