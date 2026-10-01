import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, MessageCirclePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useCustomers } from '@/hooks/useCustomers';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { useQueryClient } from '@tanstack/react-query';

const COUNTRY_CODES = [
  { code: '20', label: 'مصر +20' },
  { code: '966', label: 'السعودية +966' },
  { code: '971', label: 'الإمارات +971' },
  { code: '965', label: 'الكويت +965' },
  { code: 'intl', label: 'رقم دولي كامل' },
] as const;

const digitsOf = (value?: string | null) => String(value ?? '').replace(/\D/g, '');

/** Turn whatever the agent typed into the digits-only international form WhatsApp expects. */
export const normalizeWhatsAppPhone = (raw: string, countryCode: string): string => {
  let d = digitsOf(raw);
  if (d.startsWith('00')) d = d.slice(2);
  if (!countryCode || countryCode === 'intl') return d;
  if (d.startsWith(countryCode)) return d;
  // Already a full international number (no leading 0, 11+ digits, e.g. 9665…): keep as is.
  if (!d.startsWith('0') && d.length >= 11) return d;
  if (d.startsWith('0')) d = d.slice(1);
  return `${countryCode}${d}`;
};

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the conversation id once it exists, so the caller can open it. */
  onStarted: (conversationId: string) => void;
  /** Employee id of the current agent; the new chat is owned by them right away. */
  employeeId?: string | null;
}

export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open, onOpenChange, onStarted, employeeId,
}) => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const { customers } = useCustomers();
  const { inboxes } = useWhatsAppSettings();

  const [countryCode, setCountryCode] = useState<string>('20');
  const [phone, setPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [inboxId, setInboxId] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  const activeInboxes = useMemo(() => inboxes.filter((i: any) => i.is_active !== false), [inboxes]);
  const effectiveInboxId = inboxId || activeInboxes[0]?.id || '';

  const customerMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    const qDigits = digitsOf(customerSearch);
    return (customers || [])
      .filter((c: any) => !!c.phone)
      .filter((c: any) =>
        (c.name || '').toLowerCase().includes(q) ||
        (qDigits.length > 0 && digitsOf(c.phone).includes(qDigits)))
      .slice(0, 6);
  }, [customers, customerSearch]);

  const normalized = normalizeWhatsAppPhone(phone, countryCode);
  const isValid = normalized.length >= 10 && normalized.length <= 15;

  const reset = () => {
    setPhone(''); setCustomerId(null); setCustomerSearch(''); setCountryCode('20'); setInboxId('');
  };

  const pickCustomer = (c: any) => {
    setCustomerId(c.id);
    setCountryCode('intl');
    setPhone(digitsOf(c.phone));
    setCustomerSearch('');
  };

  const handleStart = async () => {
    if (!orgId) { toast.error('تعذر تحديد المؤسسة'); return; }
    if (!isValid) { toast.error('أدخل رقم هاتف صحيح'); return; }
    setIsWorking(true);
    try {
      // Reuse the existing chat for this number instead of splitting the history.
      const tail = normalized.slice(-9);
      const { data: existing, error: findError } = await (supabase as any)
        .from('whatsapp_conversations')
        .select('id')
        .eq('organization_id', orgId)
        .ilike('phone_number', `%${tail}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;

      if (existing?.id) {
        toast.success('توجد محادثة بهذا الرقم — تم فتحها');
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        onStarted(existing.id);
        onOpenChange(false);
        reset();
        return;
      }

      const { data: created, error } = await (supabase as any)
        .from('whatsapp_conversations')
        .insert({
          organization_id: orgId,
          phone_number: normalized,
          customer_id: customerId,
          whatsapp_settings_id: effectiveInboxId || null,
          status: employeeId ? 'active' : 'open',
          assigned_to: employeeId || null,
          assignment_reason: employeeId ? 'manual_start' : null,
        })
        .select('id')
        .single();
      if (error) throw error;

      toast.success('تم بدء المحادثة');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      onStarted(created.id);
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e?.message || 'تعذر بدء المحادثة');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCirclePlus className="h-5 w-5 text-success" /> محادثة جديدة
          </DialogTitle>
          <DialogDescription>
            اكتب رقمًا جديدًا أو اختر عميلًا مسجلًا لبدء المحادثة معه.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>اختيار عميل مسجل (اختياري)</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="ابحث باسم العميل أو رقمه..."
                className="pr-9"
              />
            </div>
            {customerMatches.length > 0 && (
              <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                {customerMatches.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-right p-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                    onClick={() => pickCustomer(c)}
                  >
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>الدولة</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((c) => (
                    <SelectItem key={c.label} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={phone}
                dir="ltr"
                inputMode="tel"
                onChange={(e) => { setPhone(e.target.value); setCustomerId(null); }}
                placeholder="1012345678"
              />
            </div>
          </div>
          {phone.trim() !== '' && (
            <p className={`text-xs ${isValid ? 'text-muted-foreground' : 'text-destructive'}`} dir="ltr">
              {isValid ? `+${normalized}` : 'رقم غير صحيح'}
            </p>
          )}

          {activeInboxes.length > 1 && (
            <div className="space-y-2">
              <Label>الإرسال من الرقم</Label>
              <Select value={effectiveInboxId} onValueChange={setInboxId}>
                <SelectTrigger><SelectValue placeholder="اختر رقم الواتساب" /></SelectTrigger>
                <SelectContent>
                  {activeInboxes.map((inbox: any) => (
                    <SelectItem key={inbox.id} value={inbox.id}>
                      {inbox.label || inbox.display_phone_number || inbox.business_name || 'رقم واتساب'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!employeeId && (
            <p className="text-xs text-muted-foreground">
              لبدء الإرسال، اربط حسابك بملف موظف نشط ثم استلم المحادثة.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleStart} disabled={!isValid || isWorking}>
            {isWorking ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
            بدء المحادثة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
