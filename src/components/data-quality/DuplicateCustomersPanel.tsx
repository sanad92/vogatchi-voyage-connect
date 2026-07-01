import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users2, Merge } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

interface DupGroup {
  normalized_phone: string;
  customer_count: number;
  customer_ids: string[];
  names: string[];
  emails: string[];
}

const DuplicateCustomersPanel: React.FC = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [keepers, setKeepers] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState<string | null>(null);

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['duplicate-customers', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<DupGroup[]> => {
      const { data, error } = await (supabase as any).rpc('find_duplicate_customers', { _org_id: orgId });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const runMerge = async (group: DupGroup) => {
    if (!orgId) return;
    const keepId = keepers[group.normalized_phone] || group.customer_ids[0];
    const mergeIds = group.customer_ids.filter((id) => id !== keepId);
    if (mergeIds.length === 0) return;
    setMerging(group.normalized_phone);
    try {
      const { data, error } = await (supabase as any).rpc('merge_customers', {
        _org_id: orgId,
        _keep_id: keepId,
        _merge_ids: mergeIds,
      });
      if (error) throw error;
      toast.success(
        `تم دمج ${data?.customers_deleted ?? 0} عميل — ${data?.bookings_moved ?? 0} حجز و ${data?.invoices_moved ?? 0} فاتورة نُقلوا`
      );
      await refetch();
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['data-quality'] });
    } catch (e: any) {
      toast.error(e.message || 'فشل الدمج');
    } finally {
      setMerging(null);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <header className="flex items-center gap-2">
        <Users2 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">عملاء مكررون (بنفس رقم الهاتف)</h2>
        <Badge variant="outline">{groups.length}</Badge>
      </header>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ الفحص…
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <p className="text-sm text-muted-foreground">لا يوجد عملاء مكررون. ✅</p>
      )}

      <div className="space-y-4">
        {groups.map((g) => {
          const keepId = keepers[g.normalized_phone] || g.customer_ids[0];
          return (
            <div key={g.normalized_phone} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm">
                  <span className="font-mono">{g.normalized_phone}</span>
                  <Badge variant="secondary" className="ms-2">{g.customer_count} سجلات</Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => runMerge(g)}
                  disabled={merging === g.normalized_phone}
                  className="gap-1"
                >
                  {merging === g.normalized_phone ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Merge className="h-3.5 w-3.5" />
                  )}
                  دمج في المُحدَّد
                </Button>
              </div>

              <RadioGroup
                value={keepId}
                onValueChange={(v) => setKeepers((s) => ({ ...s, [g.normalized_phone]: v }))}
                className="space-y-2"
              >
                {g.customer_ids.map((id, i) => (
                  <div key={id} className="flex items-center gap-3 text-sm">
                    <RadioGroupItem value={id} id={id} />
                    <Label htmlFor={id} className="flex-1 cursor-pointer">
                      <span className="font-medium">{g.names[i] || '—'}</span>
                      {g.emails[i] && (
                        <span className="text-muted-foreground ms-2">· {g.emails[i]}</span>
                      )}
                      <span className="text-muted-foreground ms-2 font-mono text-[10px]">{id.slice(0, 8)}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DuplicateCustomersPanel;
