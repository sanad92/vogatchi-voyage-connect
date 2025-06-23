
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SessionManagerProps {
  employeeId: string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ employeeId }) => {
  // Mock data - يمكن استبداله ببيانات حقيقية
  const [status, setStatus] = React.useState<'available' | 'busy' | 'away' | 'offline'>('available');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-red-100 text-red-800';
      case 'away':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'متاح';
      case 'busy':
        return 'مشغول';
      case 'away':
        return 'غائب';
      case 'offline':
        return 'غير متصل';
      default:
        return status;
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">الحالة:</span>
        <Badge className={getStatusColor(status)}>
          {getStatusText(status)}
        </Badge>
      </div>

      <Select value={status} onValueChange={(value: any) => setStatus(value)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="available">متاح</SelectItem>
          <SelectItem value="busy">مشغول</SelectItem>
          <SelectItem value="away">غائب</SelectItem>
          <SelectItem value="offline">غير متصل</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
