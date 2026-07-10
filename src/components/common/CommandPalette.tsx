import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Users, Hotel, Plane, Car, Truck, Receipt, FileText,
  Building2, Calculator, TrendingUp, Calendar, MessageSquare, Settings,
  UserCheck, Shield, FileCheck, Zap, ClipboardList, Briefcase, BarChart3,
  PlusCircle, AlertTriangle,
} from 'lucide-react';

interface PaletteItem {
  label: string;
  href: string;
  icon: React.ElementType;
  keywords?: string;
  group: string;
}

const ITEMS: PaletteItem[] = [
  // Quick create
  { label: 'عميل جديد', href: '/new-customer', icon: PlusCircle, group: 'إنشاء سريع', keywords: 'new customer add lead' },
  { label: 'حجز جديد', href: '/bookings/new', icon: PlusCircle, group: 'إنشاء سريع', keywords: 'new booking' },
  { label: 'عرض سعر جديد', href: '/quotes/new', icon: PlusCircle, group: 'إنشاء سريع', keywords: 'new quote' },
  { label: 'فاتورة جديدة', href: '/invoices/new', icon: PlusCircle, group: 'إنشاء سريع', keywords: 'new invoice' },
  { label: 'اسأل المساعد الذكي', href: '/ai-assistant', icon: PlusCircle, group: 'إنشاء سريع', keywords: 'ai assistant chat سؤال' },

  // Workspace
  { label: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard, group: 'الرئيسية', keywords: 'dashboard home' },
  { label: 'العمليات اليومية', href: '/daily-operations', icon: Briefcase, group: 'الرئيسية' },
  { label: 'تقويم الحجوزات', href: '/bookings-calendar', icon: Calendar, group: 'الرئيسية' },
  { label: 'جودة البيانات', href: '/data-quality', icon: AlertTriangle, group: 'الرئيسية' },

  // Sales
  { label: 'كل الحجوزات', href: '/bookings', icon: ClipboardList, group: 'المبيعات', keywords: 'bookings' },
  { label: 'عروض الأسعار', href: '/quotes', icon: FileCheck, group: 'المبيعات', keywords: 'quotes' },
  { label: 'حجوزات فنادق', href: '/hotel-bookings', icon: Hotel, group: 'المبيعات' },
  { label: 'حجوزات طيران', href: '/flight-bookings', icon: Plane, group: 'المبيعات' },
  { label: 'تأجير سيارات', href: '/car-rentals', icon: Car, group: 'المبيعات' },
  { label: 'نقل', href: '/transport-bookings', icon: Truck, group: 'المبيعات' },

  // Customers
  { label: 'إدارة العملاء', href: '/customers', icon: Users, group: 'العملاء' },
  { label: 'CRM', href: '/crm', icon: UserCheck, group: 'العملاء' },
  { label: 'خدمة العملاء', href: '/customer-service', icon: MessageSquare, group: 'العملاء' },
  { label: 'واتساب', href: '/whatsapp-admin', icon: MessageSquare, group: 'العملاء', keywords: 'whatsapp inbox' },

  // Finance
  { label: 'الفواتير', href: '/invoices', icon: Receipt, group: 'المالية' },
  { label: 'المستندات', href: '/documents', icon: FileText, group: 'المالية' },
  { label: 'الحسابات البنكية', href: '/bank-accounts', icon: Building2, group: 'المالية' },
  { label: 'المصروفات', href: '/expense-management', icon: Calculator, group: 'المالية' },

  // Accounting
  { label: 'لوحة CFO', href: '/cfo-dashboard', icon: TrendingUp, group: 'المحاسبة' },
  { label: 'شجرة الحسابات', href: '/chart-of-accounts', icon: FileText, group: 'المحاسبة' },
  { label: 'القيود المحاسبية', href: '/journal-entries', icon: Receipt, group: 'المحاسبة' },
  { label: 'التقارير المحاسبية', href: '/accounting-reports', icon: TrendingUp, group: 'المحاسبة' },
  { label: 'مراكز التكلفة', href: '/cost-centers', icon: BarChart3, group: 'المحاسبة' },
  { label: 'الفترات المحاسبية', href: '/accounting-periods', icon: FileText, group: 'المحاسبة' },

  // Reports
  { label: 'التقارير التشغيلية', href: '/reports', icon: FileText, group: 'التقارير' },
  { label: 'تحليل الأرباح', href: '/profit-analytics', icon: TrendingUp, group: 'التقارير' },

  // Admin
  { label: 'الموردين', href: '/suppliers', icon: Truck, group: 'الإدارة' },
  { label: 'فريق العمل', href: '/team', icon: Users, group: 'الإدارة' },
  { label: 'الأتمتة', href: '/automation', icon: Zap, group: 'الإدارة' },
  { label: 'سجل التدقيق', href: '/audit-log', icon: Shield, group: 'الإدارة' },
  { label: 'الإعدادات', href: '/admin-settings', icon: Settings, group: 'الإدارة' },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const g: Record<string, PaletteItem[]> = {};
    ITEMS.forEach((it) => {
      (g[it.group] ||= []).push(it);
    });
    return g;
  }, []);

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="ابحث عن صفحة أو إجراء…" />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>لا توجد نتائج.</CommandEmpty>
        {Object.entries(groups).map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <CommandItem
                    key={it.href}
                    value={`${it.label} ${it.keywords || ''} ${it.href}`}
                    onSelect={() => go(it.href)}
                    className="gap-2.5 py-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{it.label}</span>
                    <span className="text-[10px] text-muted-foreground/70 font-mono">{it.href}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

/** Hook: global ⌘K / Ctrl+K listener. Returns [open, setOpen]. */
export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen] as const;
};

export default CommandPalette;
