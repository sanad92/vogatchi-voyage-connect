
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, ChevronDown } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';

interface SessionManagerProps {
  employeeId: string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ employeeId }) => {
  const [currentStatus, setCurrentStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available');
  const { updateSession } = useWhatsApp();

  const statusOptions = [
    { value: 'available', label: 'متاح', color: 'bg-green-500' },
    { value: 'busy', label: 'مشغول', color: 'bg-red-500' },
    { value: 'away', label: 'بعيد', color: 'bg-yellow-500' },
    { value: 'offline', label: 'غير متصل', color: 'bg-gray-500' }
  ];

  const handleStatusChange = (newStatus: 'available' | 'busy' | 'away' | 'offline') => {
    setCurrentStatus(newStatus);
    updateSession({ employeeId, status: newStatus });
  };

  const getCurrentStatusInfo = () => {
    return statusOptions.find(option => option.value === currentStatus) || statusOptions[0];
  };

  const statusInfo = getCurrentStatusInfo();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Circle className={`w-3 h-3 ${statusInfo.color}`} />
          <span>{statusInfo.label}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value as any)}
            className="gap-2"
          >
            <Circle className={`w-3 h-3 ${option.color}`} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
