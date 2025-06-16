
import { Badge } from '@/components/ui/badge';
import { Check, X, Link, User, Crown, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeCardBadgesProps {
  employee: {
    is_active: boolean;
    linkedToUser: boolean;
    full_name: string;
  };
}

const EmployeeCardBadges = ({ employee }: EmployeeCardBadgesProps) => {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="flex flex-wrap gap-2">
      {/* شارة الحالة */}
      <Badge 
        variant={employee.is_active ? "default" : "secondary"}
        className={`transition-all duration-200 ${
          employee.is_active 
            ? isSuperAdmin()
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600 shadow-sm hover:shadow-md ring-1 ring-green-200'
              : 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-600 shadow-sm hover:shadow-md'
            : isSuperAdmin()
              ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-500 ring-1 ring-gray-300'
              : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-500'
        }`}
      >
        {employee.is_active ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            نشط
            {isSuperAdmin() && <Crown className="h-3 w-3 ml-1" />}
          </>
        ) : (
          <>
            <X className="h-3 w-3 mr-1" />
            معطل
            {isSuperAdmin() && <Crown className="h-3 w-3 ml-1" />}
          </>
        )}
      </Badge>

      {/* شارة الربط */}
      {employee.linkedToUser ? (
        <Badge 
          variant="outline" 
          className={`font-medium transition-all duration-200 ${
            isSuperAdmin()
              ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-100'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          <Link className="h-3 w-3 mr-1" />
          مرتبط بمستخدم
          {isSuperAdmin() && <Shield className="h-3 w-3 ml-1" />}
        </Badge>
      ) : (
        <Badge 
          variant="outline" 
          className={`font-medium transition-all duration-200 ${
            isSuperAdmin()
              ? 'bg-orange-50 text-orange-600 border-orange-200 ring-1 ring-orange-100'
              : 'bg-orange-50 text-orange-600 border-orange-200'
          }`}
        >
          <User className="h-3 w-3 mr-1" />
          غير مرتبط
          {isSuperAdmin() && <Shield className="h-3 w-3 ml-1" />}
        </Badge>
      )}

      {/* شارة السوبر أدمن الإضافية */}
      {isSuperAdmin() && (
        <Badge className="text-xs bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md animate-pulse">
          <Crown className="h-3 w-3 mr-1" />
          <Shield className="h-3 w-3 mr-1" />
          SA View
        </Badge>
      )}
    </div>
  );
};

export default EmployeeCardBadges;
