
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface RateFreshnessIndicatorProps {
  effectiveDate: string;
}

const RateFreshnessIndicator = ({ effectiveDate }: RateFreshnessIndicatorProps) => {
  const isToday = new Date(effectiveDate).toDateString() === new Date().toDateString();
  const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(effectiveDate).getTime()) / (1000 * 60 * 60 * 24));

  const getRateFreshnessColor = () => {
    if (isToday) return "bg-green-100 text-green-800";
    if (daysSinceUpdate <= 1) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getRateFreshnessText = () => {
    if (isToday) return "محدث اليوم";
    if (daysSinceUpdate === 1) return "أمس";
    return `منذ ${daysSinceUpdate} أيام`;
  };

  return (
    <Badge className={getRateFreshnessColor()}>
      <Clock className="h-3 w-3 mr-1" />
      {getRateFreshnessText()}
    </Badge>
  );
};

export default RateFreshnessIndicator;
