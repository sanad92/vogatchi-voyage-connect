import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Item = { id: string; description: string };
type Supplier = { id: string; name: string };
type Confirmation = { item_id: string; supplier_id: string; reference: string; recorded_at: string };
type Props = {
  organizationId: string;
  saleId: string;
  issued: boolean;
  canManage: boolean;
  items: Item[];
  suppliers: Supplier[];
};

export default function PilgrimageFitConfirmations({ organizationId, saleId, issued, canManage, items, suppliers }: Props) {
  const qc = useQueryClient();
  const [itemId, setItemId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const key = ['pilgrimage-fit-confirmations', organizationId, saleId] as const;
  const records = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pilgrimage_fit_supplier_confirmations' as never)
        .select('item_id,supplier_id,reference,recorded_at')
        .eq('organization_id', organizationId)
        .eq('sale_id', saleId);
      if (error) throw error;
      return (data ?? []) as Confirmation[];
    },
  });
  const confirmed = new Map(records.data?.map(record => [record.item_id, record]));
  const remaining = items.filter(item => !confirmed.has(item.id));
  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await callUntypedRpc<string>('record_pilgrimage_fit_supplier_confirmation', {
        _sale_id: saleId, _item_id: itemId, _supplier_id: supplierId, _reference: reference.trim(),
      });
      if (error) throw error;
      if (!data) throw new Error('تعذّر حفظ تأكيد المورد.');
    },
    onSuccess: () => {
      setItemId('');
      setSupplierId('');
      setReference('');
      void qc.invalidateQueries({ queryKey: key });
      toast.success('تم تسجيل تأكيد المورد');
    },
    onError: () => toast.error('تعذّر حفظ تأكيد المورد. راجع حالة العرض والخدمة ثم حاول مرة أخرى.'),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canManage && issued && itemId && supplierId && reference.trim().length >= 2 && !save.isPending) save.mutate();
  }

  return (
    <Card className="space-y-3 p-4">
      <h3 className="font-semibold">تأكيدات موردي الرحلة الخاصة</h3>
      <p className="text-sm text-muted-foreground">سجّل مرجع كل خدمة بعد استلام التأكيد من المورد.</p>
      {records.isLoading && <p role="status" className="text-sm text-muted-foreground">جاري تحميل تأكيدات الموردين...</p>}
      {records.isError && (
        <div className="flex items-center gap-2" role="alert">
          <p className="text-sm">تعذّر تحميل تأكيدات الموردين.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void records.refetch()}>إعادة المحاولة</Button>
        </div>
      )}
      {records.isSuccess && items.map(item => {
        const record = confirmed.get(item.id);
        const supplier = suppliers.find(s => s.id === record?.supplier_id);
        return <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
          <span>{item.description}</span>
          {record
            ? <span><span className="font-medium">تأكيد مسجّل</span>{supplier && ` · ${supplier.name}`} · <bdi data-no-translate>{record.reference}</bdi></span>
            : <span className="text-muted-foreground">بانتظار التأكيد</span>}
        </div>;
      })}
      {records.isSuccess && canManage && issued && remaining.length > 0 && (
        <form className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="fit-service">الخدمة</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger id="fit-service"><SelectValue placeholder="اختر الخدمة" /></SelectTrigger>
              <SelectContent>{remaining.map(item => <SelectItem key={item.id} value={item.id}>{item.description}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fit-supplier">المورد</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="fit-supplier"><SelectValue placeholder="اختر المورد" /></SelectTrigger>
              <SelectContent>{suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fit-reference">مرجع تأكيد المورد</Label>
            <Input id="fit-reference" maxLength={120} value={reference} onChange={event => setReference(event.currentTarget.value)} />
          </div>
          <Button type="submit" disabled={!itemId || !supplierId || reference.trim().length < 2 || save.isPending}>حفظ التأكيد</Button>
        </form>
      )}
    </Card>
  );
}
