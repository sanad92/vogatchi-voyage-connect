import { useState } from 'react';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import HandoverInbox from '@/components/sop/HandoverInbox';
import { useSopRealtime } from '@/hooks/useSop';

const SopHandovers = () => {
  useSopRealtime();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">التسليم والاستلام</h1>
        <p className="text-sm text-muted-foreground">
          كل الملفات اللي مستنية استلامك، والملفات اللي سلّمتها وبانتظار زميلك — في شاشة واحدة.
        </p>
      </header>

      <HandoverInbox onOpenLead={setSelected} />

      {selected && (
        <div className="max-w-xl">
          <SopLeadPanel leadId={selected} />
        </div>
      )}
    </div>
  );
};

export default SopHandovers;
