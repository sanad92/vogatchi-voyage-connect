
import React from 'react';
import WhatsAppDashboard from '@/components/whatsapp/WhatsAppDashboard';
import { PermissionGate } from '@/components/auth/PermissionGate';

const WhatsApp = () => {
  return (
    <PermissionGate permission="customers_view">
      <div className="h-screen">
        <WhatsAppDashboard />
      </div>
    </PermissionGate>
  );
};

export default WhatsApp;
