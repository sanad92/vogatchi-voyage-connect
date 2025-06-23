
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  MessageCircle 
} from 'lucide-react';

interface SessionManagerProps {
  employeeId: string;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ employeeId }) => {
  const [status, setStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('offline');
  const [activeConversations] = useState(0);
  const [maxConversations] = useState(5);

  const getStatusIcon = () => {
    switch (status) {
      case 'available':
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'busy':
        return <MessageCircle className="w-4 h-4 text-yellow-600" />;
      case 'away':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'offline':
        return <UserX className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      available: { label: 'متاح', className: 'bg-green-100 text-green-800' },
      busy: { label: 'مشغول', className: 'bg-yellow-100 text-yellow-800' },
      away: { label: 'غائب', className: 'bg-orange-100 text-orange-800' },
      offline: { label: 'غير متصل', className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus);
    // هنا سيتم إرسال التحديث إلى قاعدة البيانات
  };

  return (
    <Card className="w-64">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">حالة الموظف</span>
          </div>
          {getStatusBadge()}
        </div>
        
        <div className="text-sm text-gray-600 mb-3">
          المحادثات: {activeConversations}/{maxConversations}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant={status === 'available' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('available')}
            className="text-xs"
          >
            متاح
          </Button>
          <Button
            size="sm"
            variant={status === 'away' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('away')}
            className="text-xs"
          >
            غائب
          </Button>
          <Button
            size="sm"
            variant={status === 'busy' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('busy')}
            className="text-xs"
          >
            مشغول
          </Button>
          <Button
            size="sm"
            variant={status === 'offline' ? 'default' : 'outline'}
            onClick={() => handleStatusChange('offline')}
            className="text-xs"
          >
            غير متصل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
