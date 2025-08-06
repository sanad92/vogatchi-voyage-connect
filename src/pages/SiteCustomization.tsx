
import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import SiteSettings from '@/components/admin/SiteSettings';

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

        <SiteSettings />
      </div>
    </div>
  );
};

export default SiteCustomization;
