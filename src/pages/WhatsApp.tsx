
import React from 'react';
import WhatsAppDashboard from '@/components/whatsapp/WhatsAppDashboard';
import { PermissionGate } from '@/components/auth/PermissionGate';
import ErrorBoundary from '@/components/common/ErrorBoundary';

const WhatsApp = () => {
  return (
    <ErrorBoundary>
      <PermissionGate 
        requiredRole="viewer"
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                ليس لديك صلاحية للوصول
              </h2>
              <p className="text-gray-600">
                تحتاج إلى صلاحية عرض العملاء للوصول إلى WhatsApp Business
              </p>
            </div>
          </div>
        }
      >
        <div className="h-screen">
          <WhatsAppDashboard />
        </div>
      </PermissionGate>
    </ErrorBoundary>
  );
};

export default WhatsApp;
