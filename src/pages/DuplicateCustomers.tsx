import React from "react";
import DuplicateCustomersManager from "@/components/customers/DuplicateCustomersManager";
import BreadcrumbNav from "@/components/ui/breadcrumb-nav";

const DuplicateCustomersPage: React.FC = () => {
  return (
    <div className="w-full">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'إدارة علاقات العملاء', href: '/crm' },
        { label: 'العملاء المكررين' }
      ]} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold">إدارة العملاء المكررين</h1>
        <p className="text-muted-foreground mt-1">اكتشف وادمج السجلات المكررة بسرعة.</p>
      </header>
      <main>
        <section aria-label="مجموعات العملاء المكررة" className="animate-fade-in">
          <DuplicateCustomersManager />
        </section>
      </main>
    </div>
  );
};

export default DuplicateCustomersPage;
