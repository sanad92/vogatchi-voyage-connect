
import React from 'react';
import { WhatsAppAdminTabs } from '@/components/whatsapp/WhatsAppAdminTabs';
import { PermissionGate } from '@/components/auth/PermissionGate';

const WhatsAppAdmin: React.FC = () => {
  return (
    <PermissionGate requiredRole="super_admin">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6">
        <WhatsAppAdminTabs />
      </div>
    </PermissionGate>
  );
};

export default WhatsAppAdmin;
