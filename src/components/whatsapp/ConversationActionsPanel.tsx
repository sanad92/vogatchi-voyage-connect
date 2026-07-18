import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  FilePlus2,
  Receipt,
  Wallet,
  FileText,
  Ticket,
  Briefcase,
  ExternalLink,
  UserPlus,
} from 'lucide-react';

interface Props {
  conversation: any;
}

/**
 * Concierge Action Bar — lets consultants act on a booking pipeline
 * without leaving the WhatsApp conversation.
 * Presentation-only: deep-links to existing pages with query prefill.
 */
export const ConversationActionsPanel = ({ conversation }: Props) => {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const customerId: string | undefined = conversation?.customer_id;
  const phone: string | undefined = conversation?.phone_number;

  // Recent bookings for this customer
  const { data: bookings } = useQuery({
    queryKey: ['conv-actions-bookings', orgId, customerId],
    enabled: !!orgId && !!customerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bookings')
        .select('id, booking_number, booking_type, status, workflow_stage, start_date, end_date, selling_price, currency')
        .eq('organization_id', orgId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  // Latest quotes for this customer
  const { data: quotes } = useQuery({
    queryKey: ['conv-actions-quotes', orgId, customerId],
    enabled: !!orgId && !!customerId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quotes')
        .select('id, quote_number, status, total_amount, currency, created_at')
        .eq('organization_id', orgId)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  const prefill = useMemo(() => {
    const params = new URLSearchParams();
    if (customerId) params.set('customer_id', customerId);
    if (phone) params.set('phone', phone);
    if (conversation?.id) params.set('conversation_id', conversation.id);
    return params.toString();
  }, [customerId, phone, conversation?.id]);

  const q = prefill ? `?${prefill}` : '';

  return (
    <div className="p-3 space-y-4">
      {!customerId && (
        <Card className="border-dashed">
          <CardContent className="p-3 text-sm space-y-2">
            <p className="text-muted-foreground">
              لا يوجد عميل مرتبط بهذه المحادثة. اربط أو أنشئ عميلاً لتفعيل جميع إجراءات المسار.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() =>
                navigate(`/customers/new?${new URLSearchParams({ phone: phone || '' }).toString()}`)
              }
            >
              <UserPlus className="h-4 w-4 me-2" /> إنشاء عميل جديد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick create actions */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">إجراءات سريعة</p>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={<FileText className="h-4 w-4" />}
            label="عرض سعر"
            onClick={() => navigate(`/quotes/new${q}`)}
          />
          <ActionButton
            icon={<FilePlus2 className="h-4 w-4" />}
            label="حجز جديد"
            onClick={() => navigate(`/bookings/new${q}`)}
          />
          <ActionButton
            icon={<Receipt className="h-4 w-4" />}
            label="فاتورة"
            onClick={() => navigate(`/invoices/new${q}`)}
          />
          <ActionButton
            icon={<Wallet className="h-4 w-4" />}
            label="تسجيل دفعة"
            onClick={() => navigate(`/invoices${q}`)}
          />
          <ActionButton
            icon={<Ticket className="h-4 w-4" />}
            label="فاوتشر"
            onClick={() => navigate(`/documents${q}`)}
          />
          <ActionButton
            icon={<Briefcase className="h-4 w-4" />}
            label="كل الحجوزات"
            onClick={() => navigate(`/bookings${customerId ? `?customer_id=${customerId}` : ''}`)}
          />
        </div>
      </div>

      {/* Linked bookings */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">حجوزات العميل</p>
        {!customerId ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : !bookings?.length ? (
          <p className="text-xs text-muted-foreground">لا توجد حجوزات بعد</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((b: any) => (
              <Card key={b.id} className="hover:bg-accent/40 transition-colors">
                <CardContent className="p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {b.booking_number || b.id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.booking_type} · {b.start_date || '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                      {b.workflow_stage || b.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Number(b.selling_price || 0).toLocaleString()} {b.currency || ''}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => navigate(`/bookings/${b.id}/workspace`)}
                    >
                      مساحة العمل <ExternalLink className="h-3 w-3 ms-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Latest quotes */}
      {customerId && quotes && quotes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">آخر عروض السعر</p>
          <div className="space-y-2">
            {quotes.map((q: any) => (
              <Card key={q.id} className="hover:bg-accent/40 transition-colors">
                <CardContent className="p-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{q.quote_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {Number(q.total_amount || 0).toLocaleString()} {q.currency || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => navigate(`/quotes/${q.id}`)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    className="h-auto py-2 flex-col gap-1 items-center"
  >
    {icon}
    <span className="text-[11px]">{label}</span>
  </Button>
);

export default ConversationActionsPanel;
