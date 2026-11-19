import { Link, useSearchParams } from 'react-router-dom';
import { Clock, DollarSign, ShieldCheck, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmployeeManagement from '@/components/expenses/EmployeeManagement';
import AttendanceManagement from '@/components/expenses/salary/AttendanceManagement';
import SalaryManagementImproved from '@/components/expenses/salary/SalaryManagementImproved';
import CommissionManagement from '@/components/expenses/CommissionManagement';
import { useHrAccess } from '@/hooks/useHrAccess';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function EnhancedEmployeesPage() {
  usePageTitle('الموارد البشرية');
  const access = useHrAccess();
  const { canViewTeam, canManageRoles } = useSupabasePermissions();
  const [params, setParams] = useSearchParams();
  const tabs = [
    { id: 'files', label: 'ملفات الموظفين', icon: Users, allowed: access.canViewFiles, Content: EmployeeManagement },
    { id: 'attendance', label: 'الحضور والإجازات', icon: Clock, allowed: access.canViewAttendance, Content: AttendanceManagement },
    { id: 'payroll', label: 'الرواتب', icon: Wallet, allowed: access.canManagePayroll, Content: SalaryManagementImproved },
    { id: 'commissions', label: 'العمولات', icon: DollarSign, allowed: access.canManageCommissions, Content: CommissionManagement },
  ].filter(tab => tab.allowed);
  const currentTab = tabs.find(tab => tab.id === params.get('tab')) ?? tabs[0];

  return (
    <div className="space-y-6 px-4 py-6 md:px-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">الموارد البشرية</h1>
        <div className="flex flex-wrap gap-2">
          {canViewTeam() && <Button asChild variant="outline"><Link to="/team"><Users className="me-2 h-4 w-4" />الفريق والدعوات</Link></Button>}
          {canManageRoles() && <Button asChild variant="outline"><Link to="/organization/roles"><ShieldCheck className="me-2 h-4 w-4" />الأدوار والصلاحيات</Link></Button>}
        </div>
      </div>
      {access.loading ? <p role="status">جارٍ التحقق من الصلاحيات…</p>
        : currentTab ? <Tabs value={currentTab.id} onValueChange={tab => setParams({ tab }, { replace: true })} dir="rtl">
          <TabsList className="h-auto flex-wrap justify-start">
            {tabs.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id}><Icon className="me-2 h-4 w-4" />{label}</TabsTrigger>)}
          </TabsList>
          {tabs.map(({ id, Content }) => <TabsContent key={id} value={id} className="mt-4"><Content /></TabsContent>)}
        </Tabs> : <p role="status">لا توجد أقسام موارد بشرية متاحة لحسابك في هذه المؤسسة.</p>}
    </div>
  );
}
