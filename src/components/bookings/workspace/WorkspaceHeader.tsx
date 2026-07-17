import { Badge } from '@/components/ui/badge';
import { Hotel, Plane, Car, Truck, User } from 'lucide-react';
import type { Workspace, TabKey } from './types';

const typeInfo: Record<string, { label: string; icon: React.ElementType }> = {
  hotel: { label: 'حجز فندق', icon: Hotel },
  flight: { label: 'حجز طيران', icon: Plane },
  car_rental: { label: 'تأجير سيارات', icon: Car },
  transport: { label: 'نقل', icon: Truck },
};

interface Props {
  workspace: Workspace;
  onOpenTab: (t: TabKey) => void;
}

export const WorkspaceHeader = ({ workspace }: Props) => {
  const b = workspace.booking;
  const ti = typeInfo[b?.booking_type as string] || typeInfo.hotel;
  const TypeIcon = ti.icon;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TypeIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold leading-tight">
            {b?.booking_number || 'حجز'}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{ti.label}</span>
            <span>·</span>
            <User className="h-3 w-3" />
            <span>{workspace.customer?.name || b?.customer_name || 'بدون عميل'}</span>
          </p>
        </div>
      </div>
      <div className="flex-1" />
      <Badge variant="outline" className="text-xs">
        {b?.status || '—'}
      </Badge>
    </div>
  );
};
