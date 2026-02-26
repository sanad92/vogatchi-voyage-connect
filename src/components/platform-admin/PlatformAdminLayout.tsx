import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'لوحة التحكم', path: '/platform-admin', icon: LayoutDashboard },
  { label: 'المؤسسات', path: '/platform-admin/organizations', icon: Building2 },
];

const PlatformAdminLayout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold text-foreground">إدارة المنصة</h1>
          </div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            العودة للنظام <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 border-l bg-card min-h-[calc(100vh-3.5rem)] p-3">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default PlatformAdminLayout;
