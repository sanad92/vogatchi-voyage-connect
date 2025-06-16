
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Star, 
  Crown, 
  Award, 
  Target,
  TrendingUp
} from "lucide-react";

interface LoyaltyPointsDisplayProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

const LoyaltyPointsDisplay = ({ 
  points, 
  size = 'md', 
  showProgress = false,
  className = ""
}: LoyaltyPointsDisplayProps) => {
  
  const getLoyaltyTier = (points: number) => {
    if (points >= 5000) return { 
      name: 'Diamond', 
      nameAr: 'الماسي',
      color: 'bg-purple-100 text-purple-800 border-purple-200', 
      icon: Crown,
      nextTier: null,
      progress: 100
    };
    if (points >= 3000) return { 
      name: 'Gold', 
      nameAr: 'الذهبي',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      icon: Award,
      nextTier: 'Diamond',
      nextTierPoints: 5000,
      progress: ((points - 3000) / 2000) * 100
    };
    if (points >= 1500) return { 
      name: 'Silver', 
      nameAr: 'الفضي',
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: Star,
      nextTier: 'Gold',
      nextTierPoints: 3000,
      progress: ((points - 1500) / 1500) * 100
    };
    return { 
      name: 'Bronze', 
      nameAr: 'البرونزي',
      color: 'bg-orange-100 text-orange-800 border-orange-200', 
      icon: Target,
      nextTier: 'Silver',
      nextTierPoints: 1500,
      progress: (points / 1500) * 100
    };
  };

  const tier = getLoyaltyTier(points);
  const IconComponent = tier.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          badge: 'text-xs px-2 py-1',
          icon: 'h-3 w-3',
          points: 'text-sm',
          progress: 'h-1'
        };
      case 'lg':
        return {
          badge: 'text-sm px-3 py-2',
          icon: 'h-5 w-5',
          points: 'text-lg font-bold',
          progress: 'h-3'
        };
      default:
        return {
          badge: 'text-xs px-2 py-1',
          icon: 'h-4 w-4',
          points: 'text-base',
          progress: 'h-2'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge className={`${tier.color} border ${sizeClasses.badge}`}>
          <IconComponent className={`${sizeClasses.icon} mr-1`} />
          {tier.nameAr}
        </Badge>
        <span className={`${sizeClasses.points} text-purple-600`}>
          {points.toLocaleString()} نقطة
        </span>
      </div>

      {showProgress && tier.nextTier && (
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <span>للوصول للمستوى {tier.nextTier === 'Diamond' ? 'الماسي' : 
                                    tier.nextTier === 'Gold' ? 'الذهبي' : 'الفضي'}</span>
            <span>{tier.nextTierPoints - points} نقطة متبقية</span>
          </div>
          <Progress 
            value={tier.progress} 
            className={sizeClasses.progress}
          />
        </div>
      )}

      {size === 'lg' && (
        <div className="text-xs text-gray-500">
          {tier.nextTier ? 
            `${tier.nextTierPoints - points} نقطة للمستوى التالي` : 
            'أعلى مستوى في برنامج الولاء'}
        </div>
      )}
    </div>
  );
};

export default LoyaltyPointsDisplay;
