import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { elementToPdfBlob, downloadBlob } from '@/utils/htmlToPdf';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileName: string;
  /** Render-prop receives the ref to attach to the A4 sheet element. */
  children: (ref: React.RefObject<HTMLDivElement>) => ReactNode;
  /** Optional hook to persist the generated PDF into the existing document records. */
  onGenerated?: (blob: Blob) => Promise<void> | void;
}

export const DocumentPreviewDialog = ({
  open,
  onOpenChange,
  title,
  fileName,
  children,
  onGenerated,
}: Props) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handlePrint = () => {
    document.body.classList.add('printing-document');
    const cleanup = () => {
      document.body.classList.remove('printing-document');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  const handleDownload = async () => {
    const el = sheetRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const blob = await elementToPdfBlob(el);
      await onGenerated?.(blob);
      downloadBlob(blob, fileName);
      toast.success('تم إنشاء ملف PDF');
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر إنشاء ملف PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-[900px] w-[95vw] max-h-[92vh] overflow-hidden p-0 gap-0"
          dir="rtl"
        >
          <DialogHeader className="px-6 py-4 border-b no-print">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-base">{title}</DialogTitle>
              <div className="flex items-center gap-2 ms-auto">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 ml-1" />
                  طباعة
                </Button>
                <Button size="sm" onClick={handleDownload} disabled={busy}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 ml-1" />
                  )}
                  تحميل PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="doc-scroll overflow-auto p-6" style={{ maxHeight: 'calc(92vh - 70px)' }}>
            <div className="origin-top mx-auto" style={{ width: 'fit-content' }}>
              {children(sheetRef)}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dedicated print surface — kept out of the dialog so print CSS can
          isolate it from the rest of the app shell. */}
      {open &&
        createPortal(
          <div ref={printRef} className="doc-print-root hidden">
            {children(PRINT_REF)}
          </div>,
          document.body,
        )}
    </>
  );
};

// The print copy does not need a live ref handle.
const PRINT_REF = { current: null } as React.RefObject<HTMLDivElement>;
