import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, CheckCircle2, XCircle, Unplug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string | undefined;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string | undefined;
const FB_SDK_VERSION = (import.meta.env.VITE_META_GRAPH_API_VERSION as string | undefined) ?? 'v22.0';

function loadFacebookSdk(appId: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) return resolve();
    window.fbAsyncInit = () => {
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version: FB_SDK_VERSION });
      resolve();
    };
    if (document.getElementById('facebook-jssdk')) return;
    const s = document.createElement('script');
    s.id = 'facebook-jssdk';
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.body.appendChild(s);
  });
}

export const WhatsAppConnectCard: React.FC = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const [sdkReady, setSdkReady] = useState(false);
  const configured = Boolean(META_APP_ID && META_CONFIG_ID);

  useEffect(() => {
    if (!configured) return;
    loadFacebookSdk(META_APP_ID!).then(() => setSdkReady(true));
  }, [configured]);

  // Listen for Embedded Signup postMessage (WABA / phone selection metadata)
  const [signupMeta, setSignupMeta] = useState<{ waba_id?: string; phone_number_id?: string }>({});
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.data !== 'string' || !event.origin.includes('facebook.com')) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH') {
          setSignupMeta({
            waba_id: data.data?.waba_id,
            phone_number_id: data.data?.phone_number_id,
          });
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const exchangeMutation = useMutation({
    mutationFn: async (payload: { code: string; waba_id?: string; phone_number_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-oauth-exchange', {
        body: { ...payload, organization_id: orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('تم ربط رقم WhatsApp بنجاح');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', orgId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل ربط الحساب'),
  });

  const launchSignup = () => {
    if (!sdkReady || !window.FB || !META_CONFIG_ID) {
      toast.error('لم يكتمل تحميل نموذج التسجيل بعد');
      return;
    }
    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          toast.error('لم يتم إتمام تسجيل الدخول');
          return;
        }
        exchangeMutation.mutate({ code, ...signupMeta });
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding' },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          ربط رقم WhatsApp Business
        </CardTitle>
        <CardDescription>
          اختر (أو أنشئ) حساب WhatsApp Business ورقم الهاتف الذي تريد إضافته لهذه المؤسسة. يمكنك ربط أكثر من رقم.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && (
          <div className="text-sm rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
            متغيرات <code>VITE_META_APP_ID</code> / <code>VITE_META_CONFIG_ID</code> غير مضبوطة. أضفها في إعدادات المشروع لتفعيل الربط.
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={launchSignup}
            disabled={!configured || !sdkReady || exchangeMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {exchangeMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> جاري الربط...</>
            ) : (
              <><MessageCircle className="w-4 h-4 mr-2" /> ربط رقم WhatsApp جديد</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            ستُفتح نافذة Meta لاختيار الرقم الذي تريد ربطه. لن يظهر لنا أي كلمة سر. يمكنك تكرار هذه الخطوة لإضافة أرقام أخرى.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppConnectCard;
