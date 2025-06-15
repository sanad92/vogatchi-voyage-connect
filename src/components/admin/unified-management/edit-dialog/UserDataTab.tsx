
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserDataTabProps {
  userData: {
    full_name: string;
    email: string;
    phone: string;
    department: string;
  };
  onUserDataChange: (data: any) => void;
}

const UserDataTab = ({ userData, onUserDataChange }: UserDataTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="full_name">الاسم الكامل</Label>
        <Input
          id="full_name"
          value={userData.full_name}
          onChange={(e) => onUserDataChange({ ...userData, full_name: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          value={userData.email}
          onChange={(e) => onUserDataChange({ ...userData, email: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="phone">رقم الهاتف</Label>
        <Input
          id="phone"
          value={userData.phone}
          onChange={(e) => onUserDataChange({ ...userData, phone: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="department">القسم</Label>
        <Input
          id="department"
          value={userData.department}
          onChange={(e) => onUserDataChange({ ...userData, department: e.target.value })}
        />
      </div>
    </div>
  );
};

export default UserDataTab;
