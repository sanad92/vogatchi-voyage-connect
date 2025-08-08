
import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import SiteSettings from '@/components/admin/SiteSettings';
import LandingPageCMS from '@/components/admin/LandingPageCMS';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
const SiteCustomization = () => {
  const { isSuperAdmin } = useOptimizedAuth();

  if (!isSuperAdmin()) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">ليس لديك صلاحية</h1>
          <p className="text-muted-foreground">هذه الصفحة متاحة للسوبر أدمن فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">تخصيص الموقع</h1>
          <p className="text-muted-foreground">إدارة شاملة لمظهر وإعدادات الموقع</p>
        </div>

        {/* تبويبات إدارة التخصيص */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
            <TabsTrigger value="landing">صفحة الهبوط والمحتوى</TabsTrigger>
            <TabsTrigger value="blocks">إدارة البلوكات</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <SiteSettings />
          </TabsContent>

          <TabsContent value="landing">
            <LandingPageCMS />
          </TabsContent>

          <TabsContent value="blocks">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">إدارة البلوكات</h3>
                <p className="text-muted-foreground">
                  تم نقل إدارة البلوكات إلى نظام إدارة المحتوى الجديد
                </p>
                <Link to="/admin/cms">
                  <Button size="lg">
                    انتقل إلى إدارة المحتوى
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SiteCustomization;
