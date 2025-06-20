
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, UserCheck, UserX, Clock } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

interface SessionManagerProps {
  employeeId: string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ employeeId }) => {
  const [currentStatus, setCurrentStatus] = useState<string>('offline');
  const { getEmployeeSession, updateSession } = useWhatsApp();
  
  // جلب حالة الجلسة الحالية
  const { data: session, isLoading } = getEmployeeSession(employeeId);

  useEffect(() => {
    if (session) {
      setCurrentStatus(session.status);
    }
  }, [session]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateSession({ employeeId, status: newStatus });
      setCurrentStatus(newStatus);
      
      const statusMessages = {
        'online': 'أنت الآن متاح لاستقبال المحادثات',
        'busy': 'تم تعيين حالتك إلى مشغول',
        'away': 'تم تعيين حالتك إلى بعيد',
        'offline': 'تم تسجيل خروجك من الواتس اب'
      };
      
      toast.success(statusMessages[newStatus as keyof typeof statusMessages] || 'تم تحديث الحالة');
    } catch (error) {
      toast.error('فشل في تحديث حالة الجلسة');
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'online':
        return { 
          label: 'متاح', 
          color: 'bg-green-500', 
          icon: UserCheck,
          variant: 'default' as const
        };
      case 'busy':
        return { 
          label: 'مشغول', 
          color: 'bg-red-500', 
          icon: UserX,
          variant: 'destructive' as const
        };
      case 'away':
        return { 
          label: 'بعيد', 
          color: 'bg-yellow-500', 
          icon: Clock,
          variant: 'secondary' as const
        };
      default:
        return { 
          label: 'غير متصل', 
          color: 'bg-gray-500', 
          icon: UserX,
          variant: 'outline' as const
        };
    }
  };

  if (isLoading) {
    return (
      <Card className="w-fit">
        <CardContent className="p-2">
          <div className="animate-pulse h-8 w-24 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo(currentStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
          <StatusIcon className="w-4 h-4" />
          <span>{statusInfo.label}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleStatusChange('online')}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <UserCheck className="w-4 h-4" />
            متاح
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleStatusChange('busy')}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <UserX className="w-4 h-4" />
            مشغول
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleStatusChange('away')}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <Clock className="w-4 h-4" />
            بعيد
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleStatusChange('offline')}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <UserX className="w-4 h-4" />
            غير متصل
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
