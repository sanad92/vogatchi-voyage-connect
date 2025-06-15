
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'error';
}

const EnhancedEmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  variant = 'default'
}: EnhancedEmptyStateProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'search':
        return {
          cardBg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
          iconBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          iconColor: 'text-white',
          titleColor: 'text-blue-800 dark:text-blue-300',
          descColor: 'text-blue-600 dark:text-blue-400'
        };
      case 'error':
        return {
          cardBg: 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
          iconBg: 'bg-gradient-to-r from-red-500 to-orange-600',
          iconColor: 'text-white',
          titleColor: 'text-red-800 dark:text-red-300',
          descColor: 'text-red-600 dark:text-red-400'
        };
      default:
        return {
          cardBg: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
          iconBg: 'bg-gradient-to-r from-gray-500 to-gray-600',
          iconColor: 'text-white',
          titleColor: 'text-gray-800 dark:text-gray-300',
          descColor: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={`border-0 shadow-lg ${styles.cardBg}`}>
      <CardContent className="text-center py-12 px-6">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-3xl" />
          
          {/* Icon */}
          <div className={`inline-flex p-6 rounded-full ${styles.iconBg} shadow-lg mb-6 relative z-10`}>
            <Icon className={`h-12 w-12 ${styles.iconColor}`} />
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-4 max-w-md mx-auto">
          <h3 className={`text-xl font-bold ${styles.titleColor}`}>
            {title}
          </h3>
          <p className={`text-sm leading-relaxed ${styles.descColor}`}>
            {description}
          </p>
          
          {/* Action Button */}
          {actionLabel && onAction && (
            <div className="pt-4">
              <Button 
                onClick={onAction}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {actionLabel}
              </Button>
            </div>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 -right-2 w-4 h-4 bg-gradient-to-br from-pink-400/20 to-red-500/20 rounded-full animate-bounce" style={{ animationDelay: '2s' }} />
        </div>
      </CardContent>
    </Card>
  );
};

export { EnhancedEmptyState };
