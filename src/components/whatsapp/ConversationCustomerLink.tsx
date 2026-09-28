import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, UserPlus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار', confirmed: 'مؤكد', ticketed: 'مصدر', cancelled: 'ملغي',
  completed: 'مكتمل', draft: 'مسودة', paid: 'مدفوع',
};

interface Props {
  conversation: { id: string; organization_id: string; phone_number?: string | null; customer?: { id: string; name?: string | null } | null };
}

const BookingsSummary: React.FC<{ customerId: string; organizationId: string }> = ({ customerId, organizationId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['wa-customer-bookings', organizationId, customerId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bookings')
        .select('id, booking_number, booking_type, status, start_date, selling_price, currency')
        .eq('organization_id', organizationId)
        .eq('customer_id', customerId)
        .order('start_date', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">جارِ تحميل الحجوزات…</p>;
  if (error) return <p className="text-xs text-destructive">تعذر تحميل الحجوزات</p>;
  if (!data?.length) return <p className="text-xs text-muted-foreground">لا توجد حجوزات لهذا العميل بعد.</p>;

  const counts = data.reduce<Record<string, number>>((acc, b) => {
    const s = (b.status || 'pending').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary">{data.length} حجز</Badge>
        {Object.entries(counts).map(([s, n]) => (
          <Badge key={s} variant="outline">{STATUS_LABELS[s] || s}: {n}</Badge>
        ))}
      </div>
      <ul className="space-y-1 max-h-48 overflow-auto">
        {data.slice(0, 5).map((b) => (
          <li key={b.id}>
            <Link to={`/bookings/${b.id}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
              <span className="truncate font-medium" dir="ltr">{b.booking_number}</span>
              <span className="text-muted-foreground shrink-0">{b.start_date || '—'}</span>
              <Badge variant="outline" className="shrink-0 text-[10px]">{STATUS_LABELS[(b.status || '').toLowerCase()] || b.status || '—'}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ConversationCustomerLink: React.FC<Props> = ({ conversation }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(conversation.phone_number || '');
  const [email, setEmail] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      const cleanName = name.trim();
      if (!cleanName) throw new Error('اكتب اسم العميل');
      const { data: auth } = await supabase.auth.getUser();
      const { data: customer, error } = await (supabase as any)
        .from('customers')
        .insert({
          organization_id: conversation.organization_id,
          name: cleanName.slice(0, 200),
          phone: phone.trim() || null,
          email: email.trim() || null,
          created_by: auth.user?.id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const { error: linkError } = await (supabase as any)
        .from('whatsapp_conversations')
        .update({ customer_id: customer.id })
        .eq('id', conversation.id)
        .eq('organization_id', conversation.organization_id);
      if (linkError) throw linkError;
      return customer.id as string;
    },
    onSuccess: () => {
      toast.success('تم إنشاء ملف العميل وربطه بالمحادثة');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message?.includes('duplicate') || e?.message?.includes('مكرر')
      ? 'يوجد عميل مسجل بنفس الرقم أو البريد'
      : e?.message || 'تعذر إنشاء ملف العميل'),
  });

  if (conversation.customer?.id) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="hover:text-primary inline-flex items-center gap-1 shrink-0 font-medium">
            <UserIcon className="h-3 w-3" />
            ملف العميل
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3" dir="rtl">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm truncate">{conversation.customer.name}</p>
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link to={`/customers/${conversation.customer.id}`}>
                <ExternalLink className="h-3 w-3 ml-1" /> فتح الملف
              </Link>
            </Button>
          </div>
          <BookingsSummary customerId={conversation.customer.id} organizationId={conversation.organization_id} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <button type="button" onClick={() => { setPhone(conversation.phone_number || ''); setOpen(true); }}
        className="hover:text-primary inline-flex items-center gap-1 shrink-0 font-medium">
        <UserPlus className="h-3 w-3" />
        إنشاء ملف عميل
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader><DialogTitle>إنشاء ملف عميل من المحادثة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>اسم العميل *</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoFocus /></div>
            <div className="space-y-1"><Label>رقم الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" maxLength={30} /></div>
            <div className="space-y-1"><Label>البريد الإلكتروني</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" maxLength={255} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'جارِ الحفظ…' : 'إنشاء وربط'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
