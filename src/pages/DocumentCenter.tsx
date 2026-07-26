import { DocumentsPanel } from '@/components/documents/DocumentsPanel';

const DocumentCenter = () => {
  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          مركز المستندات الموحّد
        </h1>
        <p className="text-sm text-muted-foreground">
          إدارة مركزية لجوازات السفر، التأشيرات، الفاوتشرات، الفواتير، العقود وجميع المستندات المتعلقة بالعملاء والحجوزات والموردين.
        </p>
      </div>
      <DocumentsPanel title="جميع المستندات" />
    </div>
  );
};

export default DocumentCenter;
