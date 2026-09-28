import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PriceCatalogRow } from '@/hooks/usePriceCatalog';
import type { SalesBriefRow } from '@/hooks/useSalesBrief';

type Room = 'single' | 'double' | 'triple';
const ROOM_LABEL: Record<Room, string> = { single: 'سنجل', double: 'دبل', triple: 'تربل' };
const MAX_OPTIONS = 3;

interface Pick { room: Room; qty: number }
interface Props { conversationId: string; brief: SalesBriefRow; rows: PriceCatalogRow[] }

const priceOf = (r: PriceCatalogRow, room: Room) =>
  room === 'single' ? r.price_single : room === 'double' ? r.price_double : r.price_triple;

const firstRoom = (r: PriceCatalogRow): Room =>
  r.price_double ? 'double' : r.price_single ? 'single' : 'triple';

export const SalesQuoteDraftBuilder: React.FC<Props> = ({ conversationId, brief, rows }) => {
  const orgId = useOrgId();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [saving, setSaving] = useState(false);
  const requestId = useRef<string>(crypto.randomUUID());

  const { data: ctx } = useQuery({
    queryKey: ['sales-quote-ctx', orgId, conversationId],
    queryFn: async () => {
      const [conv, settings] = await Promise.all([
        (supabase as any).from('whatsapp_conversations')
          .select('customer_id, phone_number, customer:customers(name)')
          .eq('organization_id', orgId).eq('id', conversationId).maybeSingle(),
        (supabase as any).from('organization_settings').select('currency').eq('organization_id', orgId).maybeSingle(),
      ]);
      return {
        customerId: conv.data?.customer_id as string | null,
        customerName: (conv.data?.customer?.name || conv.data?.phone_number || '') as string,
        currency: (settings.data?.currency || '').toUpperCase() as string,
      };
    },
    enabled: !!orgId && !!conversationId,
  });

  const nights = useMemo(() => {
    if (!brief.travel_from || !brief.travel_to) return 1;
    const diff = (new Date(brief.travel_to).getTime() - new Date(brief.travel_from).getTime()) / 86_400_000;
    return Math.max(1, Math.ceil(diff));
  }, [brief.travel_from, brief.travel_to]);
  const travelers = Math.max(1, (brief.adults || 0) + (brief.children || 0));

  const candidates = rows.filter((r) => r.price_single || r.price_double || r.price_triple).slice(0, 8);
  const selected = Object.keys(picks);
  const mismatched = candidates.some((r) => picks[r.id] && ctx?.currency && r.currency.toUpperCase() !== ctx.currency);

  const toggle = (r: PriceCatalogRow) => setPicks((p) => {
    if (p[r.id]) { const { [r.id]: _, ...rest } = p; return rest; }
    if (Object.keys(p).length >= MAX_OPTIONS) { toast.error(`الحد الأقصى ${MAX_OPTIONS} خيارات في العرض`); return p; }
    return { ...p, [r.id]: { room: firstRoom(r), qty: r.unit === 'per_person' ? travelers : 1 } };
  });

  const create = async () => {
    if (!orgId || !selected.length || saving) return;
    if (!ctx?.customerName) { toast.error('لا يمكن تحديد اسم العميل لهذه المحادثة'); return; }
    const items = candidates.filter((r) => picks[r.id]).map((r, i) => {
      const { room, qty } = picks[r.id];
      const price = Number(priceOf(r, room) || 0);
      const perPerson = r.unit === 'per_person';
      return {
        item_type: 'hotel',
        description: `خيار ${i + 1}: ${r.name}${r.rating ? ` (${r.rating})` : ''} — ${r.destination} — ${ROOM_LABEL[room]}${r.board ? ` — ${r.board}` : ''} — ${nights} ليلة`,
        quantity: Math.max(1, Math.round(qty)),
        cost_price: 0,
        selling_price: Math.round(price * nights * 100) / 100,
        details: {
          source: 'ai_price_catalog', catalog_id: r.id, room_type: room, nights,
          unit: perPerson ? 'per_person' : 'per_room', catalog_currency: r.currency, needs_cost_review: true,
        },
      };
    });
    const notes = [
      'مسودة من وكيل المبيعات الذكي — بانتظار مراجعة الموظف وتأكيد التوافر وإضافة التكلفة قبل الإرسال.',
      selected.length > 1 ? 'البنود خيارات بديلة للعميل وليست حزمة واحدة.' : null,
      brief.children ? `أطفال: ${brief.children}${brief.children_ages ? ` (أعمار: ${brief.children_ages})` : ''}` : null,
      brief.budget_range ? `الميزانية: ${brief.budget_range}` : null,
      brief.notes,
    ].filter(Boolean).join('\n');

    setSaving(true);
    try {
      const { data, error } = await callUntypedRpc<{ id: string }>('create_quote_atomic', {
        _org: orgId, _request_id: requestId.current,
        _payload: {
          status: 'draft',
          customer_id: ctx.customerId || undefined,
          customer_name: ctx.customerId ? undefined : ctx.customerName,
          destination: brief.destination || '',
          travel_date: brief.travel_from || '',
          return_date: brief.travel_to || '',
          number_of_travelers: travelers,
          notes, items,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.id) throw new Error('لم يرجع الخادم تأكيد حفظ العرض');
      requestId.current = crypto.randomUUID();
      setPicks({});
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('تم إنشاء مسودة العرض — راجعها قبل الإرسال', {
        action: { label: 'فتح العرض', onClick: () => navigate(`/quotes/${data.id}`) },
      });
    } catch (e: any) {
      toast.error('تعذّر إنشاء المسودة: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!candidates.length) return null;

  return (
    <div className="space-y-2 rounded-lg border p-2">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-semibold flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> مسودة عرض سعر</h5>
        <span className="text-[10px] text-muted-foreground">{nights} ليلة • {travelers} مسافر</span>
      </div>
      <p className="text-[11px] text-muted-foreground">اختر حتى {MAX_OPTIONS} خيارات. المسودة لا تُرسل للعميل، وتفتح في العروض للمراجعة.</p>

      {candidates.map((r) => {
        const pick = picks[r.id];
        const rooms = (['single', 'double', 'triple'] as Room[]).filter((k) => priceOf(r, k));
        return (
          <div key={r.id} className="rounded border p-2 text-xs space-y-1.5">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox checked={!!pick} onCheckedChange={() => toggle(r)} className="mt-0.5" />
              <span className="flex-1">
                <span className="font-medium">{r.name}</span>{r.rating ? ` — ${r.rating}` : ''}
                <span className="block text-muted-foreground">{[r.board, r.valid_from && r.valid_to ? `${r.valid_from} → ${r.valid_to}` : null].filter(Boolean).join(' | ')}</span>
              </span>
            </label>
            {pick && (
              <div className="flex items-center gap-1.5">
                <Select value={pick.room} onValueChange={(v) => setPicks((p) => ({ ...p, [r.id]: { ...pick, room: v as Room } }))}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((k) => <SelectItem key={k} value={k}>{ROOM_LABEL[k]} — {priceOf(r, k)} {r.currency}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min={1} max={50} value={pick.qty} aria-label={r.unit === 'per_person' ? 'عدد الأفراد' : 'عدد الغرف'}
                  onChange={(e) => setPicks((p) => ({ ...p, [r.id]: { ...pick, qty: Math.min(50, Math.max(1, Number(e.target.value) || 1)) } }))}
                  className="h-7 w-14 text-xs" />
                <span className="text-muted-foreground">{r.unit === 'per_person' ? 'فرد' : 'غرفة'}</span>
              </div>
            )}
          </div>
        );
      })}

      {mismatched && (
        <p className="text-[11px] text-warning">عملة بعض الأسعار تختلف عن عملة الشركة ({ctx?.currency}) — راجع المبالغ في العرض.</p>
      )}
      <Button size="sm" className="w-full" disabled={!selected.length || saving} onClick={create}>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `إنشاء مسودة عرض (${selected.length})`}
      </Button>
    </div>
  );
};
