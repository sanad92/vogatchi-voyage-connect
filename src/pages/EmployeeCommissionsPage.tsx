import CommissionManagement from '@/components/expenses/CommissionManagement';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function EmployeeCommissionsPage() {
  usePageTitle('عمولات الموظفين');
  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">عمولات الموظفين</h1>
        <p className="text-sm text-muted-foreground mt-2">حساب ومراجعة الاستحقاقات المرتبطة بالحجوزات، ومتابعة اعتمادها وصرفها.</p>
      </header>
      <CommissionManagement />
    </div>
  );
}
