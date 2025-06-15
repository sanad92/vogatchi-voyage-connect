
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus } from 'lucide-react';

interface ExchangeRateEmptyStateProps {
  onShowAddForm: () => void;
}

const ExchangeRateEmptyState = ({ onShowAddForm }: ExchangeRateEmptyStateProps) => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أسعار صرف</h3>
        <p className="text-gray-500 mb-4">ابدأ بإضافة أسعار الصرف للعملات المختلفة</p>
        <Button onClick={onShowAddForm}>
          <Plus className="h-4 w-4 mr-2" />
          إضافة سعر صرف
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExchangeRateEmptyState;
