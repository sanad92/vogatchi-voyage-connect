
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CircleIcon, Settings } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';

interface SessionManagerProps {
  employeeId: string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ employeeId }) => {
  const { getEmployeeSession, updateSession } = useWhatsApp();
  const { data: session } = getEmployeeSession(employeeId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-500';
      case 'busy': return 'text-yellow-500';
      case 'away': return 'text-orange-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'متاح';
      case 'busy': return 'مشغول';
      case 'away': return 'بعيد';
      case 'offline': return 'غير متصل';
      default: return 'غير محدد';
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateSession({ employeeId, status: newStatus });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-gray-600">
        المحادثات النشطة: {session?.active_conversations_count || 0}/{session?.max_conversations || 5}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CircleIcon className={`w-3 h-3 fill-current ${getStatusColor(session?.status || 'offline')}`} />
            {getStatusText(session?.status || 'offline')}
            <Settings className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleStatusChange('available')}>
            <CircleIcon className="w-3 h-3 fill-current text-green-500 mr-2" />
            متاح
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('busy')}>
            <CircleIcon className="w-3 h-3 fill-current text-yellow-500 mr-2" />
            مشغول
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('away')}>
            <CircleIcon className="w-3 h-3 fill-current text-orange-500 mr-2" />
            بعيد
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleStatusChange('offline')}>
            <CircleIcon className="w-3 h-3 fill-current text-gray-500 mr-2" />
            غير متصل
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
