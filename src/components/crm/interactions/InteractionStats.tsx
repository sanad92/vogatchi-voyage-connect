
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Phone, Mail, TrendingUp } from 'lucide-react';

interface InteractionStatsProps {
  interactions: any[] | undefined;
}

const InteractionStats = ({ interactions }: InteractionStatsProps) => {
  const totalInteractions = interactions?.length || 0;
  const phoneInteractions = interactions?.filter(i => i.communication_type === 'phone').length || 0;
  const emailInteractions = interactions?.filter(i => i.communication_type === 'email').length || 0;
  const whatsappInteractions = interactions?.filter(i => i.communication_type === 'whatsapp').length || 0;
  const completedInteractions = interactions?.filter(i => i.status === 'completed').length || 0;
  const completionRate = totalInteractions > 0 ? (completedInteractions / totalInteractions) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي التفاعلات</p>
              <p className="text-2xl font-bold">{totalInteractions}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">المكالمات</p>
              <p className="text-2xl font-bold">{phoneInteractions}</p>
            </div>
            <Phone className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الرسائل الإلكترونية</p>
              <p className="text-2xl font-bold">{emailInteractions}</p>
            </div>
            <Mail className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معدل الإنجاز</p>
              <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InteractionStats;
