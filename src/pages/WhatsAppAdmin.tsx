
import React from 'react';
import { WhatsAppAdminTabs } from '@/components/whatsapp/WhatsAppAdminTabs';
import { PermissionGate } from '@/components/auth/PermissionGate';

const WhatsAppAdmin: React.FC = () => {
  return (
    <PermissionGate requiredRole="super_admin">
      <div className="container mx-auto px-4 py-6">
        <WhatsAppAdminTabs />
      </div>
    </PermissionGate>
  );
};

export default WhatsAppAdmin;
