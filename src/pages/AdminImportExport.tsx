
import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import DataImportExport from '@/components/admin/DataImportExport';
import EnhancedReportExporter from '@/components/admin/EnhancedReportExporter';

const AdminImportExport = () => {
  const { hasRole, isSuperAdmin } = useOptimizedAuth();

  if (!hasRole('admin') && !hasRole('manager') && !isSuperAdmin()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ليس لديك صلاحية</h1>
          <p className="text-gray-600">هذه الصفحة متاحة للأدمن والمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">استيراد وتصدير البيانات</h1>
          <p className="text-gray-600">إدارة شاملة لاستيراد وتصدير جميع بيانات النظام</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <DataImportExport />
          <EnhancedReportExporter />
        </div>
      </div>
    </div>
  );
};

export default AdminImportExport;
