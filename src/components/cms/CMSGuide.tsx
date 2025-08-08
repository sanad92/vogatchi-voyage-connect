import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cmsGuide } from '@/utils/cmsExamples';
import { Book, Lightbulb, Layout, Settings } from 'lucide-react';

const CMSGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">دليل استعمال نظام إدارة المحتوى</h2>
        <p className="text-muted-foreground">تعلم كيفية استعمال النظام بكفاءة</p>
      </div>

      <Tabs defaultValue="blocks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="blocks" className="flex items-center gap-2">
            <Layout size={16} />
            أنواع البلوكات
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            إعدادات التخطيط
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-2">
            <Lightbulb size={16} />
            نصائح مفيدة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(cmsGuide.blockTypes).map(([key, block]) => (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{block.name}</CardTitle>
                    <Badge variant="secondary">{key}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-muted-foreground">{block.description}</p>
                  <div className="text-sm">
                    <span className="font-medium text-primary">الاستعمال المثالي:</span> {block.useCase}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6">
            {Object.entries(cmsGuide.layoutSettings).map(([settingKey, options]) => (
              <Card key={settingKey}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {settingKey === 'container_width' && 'عرض الحاوية'}
                    {settingKey === 'padding_y' && 'المسافة العمودية'}
                    {settingKey === 'text_align' && 'محاذاة النص'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {Object.entries(options).map(([optionKey, description]) => (
                      <div key={optionKey} className="flex items-center justify-between p-2 bg-secondary/20 rounded">
                        <Badge variant="outline">{optionKey}</Badge>
                        <span className="text-sm text-muted-foreground">{description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book size={20} />
                نصائح لاستعمال أفضل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cmsGuide.tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-secondary/20 rounded">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CMSGuide;