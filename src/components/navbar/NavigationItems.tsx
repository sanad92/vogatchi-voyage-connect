
import {
  Home,
  Calendar,
  Building,
  Plane,
  Users,
  Headphones as HeadphonesIcon,
  Truck,
  FileText,
  CreditCard,
  BarChart,
  Settings,
  Building2
} from "lucide-react";

interface NavItem {
  to: string;
  icon: any;
  label: string;
  allowedRoles: string[];
}

export const getNavigationItems = (userRole: string | undefined) => {
  const items = [
    {
      to: "/",
      icon: Home,
      label: "الرئيسية",
      allowedRoles: ["super_admin", "admin", "manager", "sales_agent", "accountant", "viewer"]
    },
    {
      to: "/daily-operations",
      icon: Calendar,
      label: "العمليات اليومية",
      allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
    },
    {
      to: "/hotel-bookings",
      icon: Building,
      label: "حجوزات الفنادق",
      allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
    },
    {
      to: "/flight-bookings",
      icon: Plane,
      label: "حجوزات الطيران",
      allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
    },
    {
      to: "/customers",
      icon: Users,
      label: "العملاء",
      allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
    },
    {
      to: "/customer-service",
      icon: HeadphonesIcon,
      label: "خدمة العملاء",
      allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
    },
    {
      to: "/suppliers",
      icon: Truck,
      label: "الموردين",
      allowedRoles: ["super_admin", "admin", "manager"]
    },
    {
      to: "/invoices",
      icon: FileText,
      label: "الفواتير",
      allowedRoles: ["super_admin", "admin", "manager", "accountant"]
    },
    {
      to: "/payment-orders",
      icon: CreditCard,
      label: "أوامر الدفع",
      allowedRoles: ["super_admin", "admin", "manager", "accountant"]
    },
    {
      to: "/bank-accounts",
      icon: Building2,
      label: "الحسابات البنكية",
      allowedRoles: ["super_admin", "admin", "manager", "accountant"]
    },
    {
      to: "/reports",
      icon: BarChart,
      label: "التقارير",
      allowedRoles: ["super_admin", "admin", "manager", "accountant"]
    },
    {
      to: "/admin-settings",
      icon: Settings,
      label: "إعدادات النظام",
      allowedRoles: ["super_admin"]
    }
  ];

  return items.filter(item => item.allowedRoles.includes(userRole || "viewer"));
};

// Export organized groups for compatibility with existing components
export const mainNavItems = [
  {
    to: "/",
    icon: Home,
    label: "الرئيسية",
    allowedRoles: ["super_admin", "admin", "manager", "sales_agent", "accountant", "viewer"]
  },
  {
    to: "/daily-operations",
    icon: Calendar,
    label: "العمليات اليومية",
    allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
  }
];

export const businessNavItems = [
  {
    to: "/hotel-bookings",
    icon: Building,
    label: "حجوزات الفنادق",
    allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
  },
  {
    to: "/flight-bookings",
    icon: Plane,
    label: "حجوزات الطيران",
    allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
  },
  {
    to: "/customers",
    icon: Users,
    label: "العملاء",
    allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
  },
  {
    to: "/suppliers",
    icon: Truck,
    label: "الموردين",
    allowedRoles: ["super_admin", "admin", "manager"]
  }
];

export const communicationNavItems = [
  {
    to: "/customer-service",
    icon: HeadphonesIcon,
    label: "خدمة العملاء",
    allowedRoles: ["super_admin", "admin", "manager", "sales_agent"]
  }
];

export const adminNavItems = [
  {
    to: "/invoices",
    icon: FileText,
    label: "الفواتير",
    allowedRoles: ["super_admin", "admin", "manager", "accountant"]
  },
  {
    to: "/payment-orders",
    icon: CreditCard,
    label: "أوامر الدفع",
    allowedRoles: ["super_admin", "admin", "manager", "accountant"]
  },
  {
    to: "/bank-accounts",
    icon: Building2,
    label: "الحسابات البنكية",
    allowedRoles: ["super_admin", "admin", "manager", "accountant"]
  },
  {
    to: "/reports",
    icon: BarChart,
    label: "التقارير",
    allowedRoles: ["super_admin", "admin", "manager", "accountant"]
  },
  {
    to: "/admin-settings",
    icon: Settings,
    label: "إعدادات النظام",
    allowedRoles: ["super_admin"]
  }
];

// Legacy export for backward compatibility
export const navigationItems = getNavigationItems;
