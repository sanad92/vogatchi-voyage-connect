import React from "react";
import DuplicateCustomersManager from "@/components/customers/DuplicateCustomersManager";

const DuplicateCustomersPage: React.FC = () => {
  return (
    <div className="w-full">
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
