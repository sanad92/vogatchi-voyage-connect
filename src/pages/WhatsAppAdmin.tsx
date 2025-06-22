
import React from 'react';
import { WhatsAppAdminTabs } from '@/components/whatsapp/WhatsAppAdminTabs';
import { PermissionGate } from '@/components/auth/PermissionGate';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const WhatsAppAdmin = () => {
  return (
    <ErrorBoundary>
      <PermissionGate 
        permission="system_settings"
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                ليس لديك صلاحية للوصول
              </h2>
              <p className="text-gray-600">
                تحتاج إلى صلاحية إدارة النظام للوصول إلى إدارة WhatsApp Business
              </p>
            </div>
          </div>
        }
      >
        <div className="min-h-screen p-6">
          <WhatsAppAdminTabs />
        </div>
      </PermissionGate>
    </ErrorBoundary>
  );
};

export default WhatsAppAdmin;
