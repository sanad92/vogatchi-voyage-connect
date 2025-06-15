
import { Mail, Phone, Building } from 'lucide-react';

interface UserInfoProps {
  user: {
    email: string;
    phone?: string;
    department?: string;
  };
}

const UserInfo = ({ user }: UserInfoProps) => {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700">بيانات الحساب</h4>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Mail className="h-3 w-3 text-gray-400" />
          <span>{user.email}</span>
        </div>
        {user.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-gray-400" />
            <span>{user.phone}</span>
          </div>
        )}
        {user.department && (
          <div className="flex items-center gap-2">
            <Building className="h-3 w-3 text-gray-400" />
            <span>{user.department}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserInfo;
