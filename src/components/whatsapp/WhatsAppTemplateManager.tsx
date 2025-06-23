
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

export const WhatsAppTemplateManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            قوالب الرسائل
          </h2>
          <p className="text-gray-600 mt-1">
            إدارة قوالب رسائل WhatsApp Business المعتمدة
          </p>
        </div>
        
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          قالب جديد
        </Button>
      </div>

      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد قوالب</h3>
        <p className="text-gray-500 mb-4">ابدأ بإنشاء قوالب رسائل WhatsApp Business</p>
        <Button>
          إنشاء قالب جديد
        </Button>
      </div>
    </div>
  );
};
