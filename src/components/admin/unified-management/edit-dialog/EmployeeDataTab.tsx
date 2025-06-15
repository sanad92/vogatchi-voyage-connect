
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmployeeDataTabProps {
  employeeData: {
    position: string;
    base_salary: number;
    allowances: number;
    commission_rate: number;
    bank_name: string;
    bank_account_number: string;
    national_id: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
  };
  onEmployeeDataChange: (data: any) => void;
  hasEmployee: boolean;
}

const EmployeeDataTab = ({ employeeData, onEmployeeDataChange, hasEmployee }: EmployeeDataTabProps) => {
  if (!hasEmployee) {
    return (
      <div className="text-center text-gray-600">
        هذا المستخدم غير مرتبط بموظف
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="position">المنصب</Label>
        <Input
          id="position"
          value={employeeData.position}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, position: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="base_salary">الراتب الأساسي (ج.م)</Label>
        <Input
          id="base_salary"
          type="number"
          value={employeeData.base_salary}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, base_salary: Number(e.target.value) })}
        />
      </div>
      
      <div>
        <Label htmlFor="allowances">البدلات (ج.م)</Label>
        <Input
          id="allowances"
          type="number"
          value={employeeData.allowances}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, allowances: Number(e.target.value) })}
        />
      </div>
      
      <div>
        <Label htmlFor="commission_rate">معدل العمولة (%)</Label>
        <Input
          id="commission_rate"
          type="number"
          step="0.01"
          value={employeeData.commission_rate}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, commission_rate: Number(e.target.value) })}
        />
      </div>
      
      <div>
        <Label htmlFor="bank_name">اسم البنك</Label>
        <Input
          id="bank_name"
          value={employeeData.bank_name}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, bank_name: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="bank_account_number">رقم الحساب البنكي</Label>
        <Input
          id="bank_account_number"
          value={employeeData.bank_account_number}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, bank_account_number: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="national_id">الرقم القومي</Label>
        <Input
          id="national_id"
          value={employeeData.national_id}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, national_id: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="emergency_contact_name">جهة الاتصال في الطوارئ</Label>
        <Input
          id="emergency_contact_name"
          value={employeeData.emergency_contact_name}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, emergency_contact_name: e.target.value })}
        />
      </div>
      
      <div className="md:col-span-2">
        <Label htmlFor="emergency_contact_phone">هاتف جهة الاتصال في الطوارئ</Label>
        <Input
          id="emergency_contact_phone"
          value={employeeData.emergency_contact_phone}
          onChange={(e) => onEmployeeDataChange({ ...employeeData, emergency_contact_phone: e.target.value })}
        />
      </div>
    </div>
  );
};

export default EmployeeDataTab;
