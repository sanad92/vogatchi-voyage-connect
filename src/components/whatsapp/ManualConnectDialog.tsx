import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export const ManualConnectDialog: React.FC = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [result, setResult] = useState<{ business_name?: string; display_phone_number?: string } | null>(null);

  const getFunctionErrorMessage = async (error: any) => {
    const fallback = error?.message || 'فشل الربط';
    const response = error?.context;
    if (!response || typeof response.clone !== 'function') return fallback;

    try {
      const payload = await response.clone().json();
      const metaMessage = payload?.details?.phone?.error?.message
        || payload?.details?.phone_list?.error?.message
        || payload?.details?.error?.message;
      return payload?.error || metaMessage || fallback;
    } catch (_) {
      return fallback;
    }
  };

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-manual-connect', {
        body: {
          organization_id: orgId,
          access_token: accessToken.trim(),
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim(),
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('تم ربط WhatsApp بنجاح');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection', orgId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] });
      setAccessToken('');
      setTimeout(() => {
        setOpen(false);
        setResult(null);
      }, 1500);
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الربط'),
  });

  const canSubmit = accessToken.trim() && phoneNumberId.trim() && wabaId.trim() && !connectMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="w-4 h-4 mr-2" />
          ربط يدوي (Advanced)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ربط WhatsApp Business بتوكن دائم</DialogTitle>
          <DialogDescription>
            استخدم هذه الطريقة إذا كان لديك System User Token دائم من Meta Business Settings. جميع الحقول مطلوبة.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <CheckCircle2 className="w-5 h-5" /> تم الربط بنجاح
            </div>
            <div className="text-sm">البزنس: <span className="font-medium">{result.business_name ?? '—'}</span></div>
            <div className="text-sm">الرقم: <span className="font-medium">{result.display_phone_number ?? '—'}</span></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access_token">Permanent Access Token</Label>
              <Input
                id="access_token"
                type="password"
                autoComplete="off"
                placeholder="EAAG..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                من Business Settings → Users → System Users → Generate Token
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input
                id="phone_number_id"
                placeholder="مثال: 1234567890"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">من WhatsApp Manager → API Setup</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waba_id">WhatsApp Business Account ID (WABA)</Label>
              <Input
                id="waba_id"
                placeholder="مثال: 9876543210"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
              />
            </div>

            <Button
              onClick={() => connectMutation.mutate()}
              disabled={!canSubmit}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {connectMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> جاري الاختبار والربط...</>
              ) : (
                'اختبار وربط'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManualConnectDialog;
