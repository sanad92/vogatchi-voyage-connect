
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export const WhatsAppAnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          تحليلات WhatsApp Business
        </h2>
        <p className="text-gray-600 mt-1">
          إحصائيات وتحليلات شاملة لأداء WhatsApp Business
        </p>
      </div>

      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">قريباً</h3>
        <p className="text-gray-500 mb-4">ستتوفر التحليلات والإحصائيات قريباً</p>
      </div>
    </div>
  );
};
