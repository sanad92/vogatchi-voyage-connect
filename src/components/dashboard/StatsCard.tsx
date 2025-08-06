
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  description?: string;
}

const StatsCard = ({ title, value, icon: Icon, color, description }: StatsCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
