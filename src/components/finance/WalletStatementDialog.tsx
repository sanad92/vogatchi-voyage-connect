import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { walletStatementDay } from '@/lib/walletStatement';
import type { PartyWalletMovement } from '@/lib/partyWalletMovements';

interface Props {
  kind: 'customer' | 'supplier';
  partyName: string;
  organizationName: string;
  movements: PartyWalletMovement[];
  ready: boolean;
  onClose: () => void;
}

export function WalletStatementDialog({ kind, partyName, organizationName, movements, ready, onClose }: Props) {
  const today = walletStatementDay(new Date())!;
  const { language, dir, t } = useLanguage();
  const [from, setFrom] = useState(() => `${today.slice(0, 7)}-01`);
  const [through, setThrough] = useState(today);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const exporting = useRef(false);
  const valid = !!from && !!through && from <= through;

  async function exportStatement(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || !valid || exporting.current) return;
    exporting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const { downloadWalletStatement } = await import('@/utils/walletStatementPdf');
      await downloadWalletStatement({ kind, partyName, organizationName, from, through, language, movements, translate: t });
      onClose();
    } catch {
      setFailed(true);
    } finally {
      exporting.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent dir={dir} aria-describedby={undefined}>
        <DialogHeader><DialogTitle>كشف المحفظة PDF</DialogTitle></DialogHeader>
        <form onSubmit={exportStatement} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wallet-statement-from">من تاريخ</Label>
              <Input id="wallet-statement-from" type="date" min="0001-01-01" max={through || '9999-12-31'} value={from}
                required disabled={busy} onChange={event => setFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-statement-through">إلى تاريخ</Label>
              <Input id="wallet-statement-through" type="date" min={from || '0001-01-01'} max="9999-12-31" value={through}
                required disabled={busy} onChange={event => setThrough(event.target.value)} />
            </div>
          </div>
          {from && through && from > through && <p role="alert" className="text-sm text-destructive">تاريخ النهاية يسبق تاريخ البداية</p>}
          {!ready && <p role="alert" className="text-sm text-destructive">سجل المحفظة غير جاهز للتنزيل</p>}
          {failed && <p role="alert" className="text-sm text-destructive">تعذر إنشاء كشف المحفظة</p>}
          <Button type="submit" disabled={!ready || !valid || busy}>{busy ? 'جارٍ تجهيز الكشف…' : 'تنزيل PDF'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
