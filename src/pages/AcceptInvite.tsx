import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Check, Loader2, UserPlus, X } from 'lucide-react';
import { useAcceptInvitation, type AcceptInvitationResult } from '@/hooks/useInvitations';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const invitationTokenPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

async function checkInvitation(token: string, email?: string) {
  const { data, error } = await supabase.rpc('get_staff_invitation_status', {
    _token: token,
    ...(email ? { _email: email } : {}),
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('تعذّر التحقق من الدعوة.');
  }
  return data;
}

const inactiveMessages: Record<string, string> = {
  cancelled: 'تم إلغاء هذه الدعوة. اطلب دعوة جديدة من مسؤول المؤسسة.',
  expired: 'انتهت صلاحية هذه الدعوة. اطلب دعوة جديدة من مسؤول المؤسسة.',
  accepted: 'تم قبول هذه الدعوة من قبل.',
};

function InvitationFlow({ token }: { token: string }) {
  const { user, loading } = useOptimizedAuth();
  const { mutateAsync: acceptInvitation } = useAcceptInvitation();
  const [result, setResult] = useState<AcceptInvitationResult | null>(null);
  const attemptedUser = useRef<string>();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const redirectPath = `/accept-invite?token=${encodeURIComponent(token)}`;
  const validToken = invitationTokenPattern.test(token);
  const invitation = useQuery({
    queryKey: ['staff-invitation-status', token],
    queryFn: () => checkInvitation(token),
    enabled: validToken,
    retry: false,
  });
  const status = invitation.data?.status;

  useEffect(() => {
    if (!user || status !== 'pending' || attemptedUser.current === user.id) return;
    attemptedUser.current = user.id;
    acceptInvitation(token).then(setResult).catch((error: unknown) => {
      setResult({ success: false, error: error instanceof Error ? error.message : 'تعذر قبول الدعوة' });
    });
  }, [acceptInvitation, status, token, user]);

  async function sendConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || sent) return;
    setEmailError('');
    setSending(true);
    try {
      const address = email.trim().toLowerCase();
      const currentInvitation = await checkInvitation(token, address);
      if (currentInvitation.status !== 'pending') {
        void invitation.refetch();
        return;
      }
      if (currentInvitation.email_matches !== true) {
        setEmailError('استخدم نفس بريد العمل الذي وصلته الدعوة.');
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}${redirectPath}`,
        },
      });
      if (error) {
        setEmailError(error.status === 429
          ? 'تم طلب روابط كثيرة. انتظر قليلًا ثم أعد المحاولة.'
          : 'تعذّر إرسال رابط التأكيد. حاول مرة أخرى.');
        return;
      }
      setSent(true);
    } catch {
      setEmailError('تعذّر إرسال رابط التأكيد. حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  }

  async function switchAccount() {
    setEmailError('');
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      setEmailError('تعذّر تسجيل الخروج. حاول مرة أخرى.');
      return;
    }
    attemptedUser.current = undefined;
    setResult(null);
  }

  function openDashboard() {
    if (user && result?.organization_id) {
      try {
        localStorage.setItem(`current_org_${user.id}`, result.organization_id);
      } catch {
        // The organization picker remains available when storage is unavailable.
      }
    }
    window.location.assign('/dashboard');
  }

  const inactiveMessage = typeof status === 'string' ? inactiveMessages[status] : undefined;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <UserPlus className="size-6" aria-hidden="true" />
            دعوة للانضمام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {result?.success ? (
            <>
              <Check className="mx-auto size-12 text-green-600" aria-hidden="true" />
              <h2 className="text-xl font-bold">تم قبول الدعوة</h2>
              <p className="text-muted-foreground">{result.message}</p>
              <Button onClick={openDashboard}>الذهاب للوحة التحكم</Button>
            </>
          ) : !validToken ? (
            <>
              <X className="mx-auto size-12 text-destructive" aria-hidden="true" />
              <h2 className="text-xl font-bold">رابط غير صالح</h2>
              <p className="text-muted-foreground">رابط الدعوة غير صحيح أو مفقود</p>
            </>
          ) : invitation.isPending || loading ? (
            <Loader2 className="mx-auto size-10 animate-spin text-primary" aria-label="جارٍ التحميل..." />
          ) : invitation.isError ? (
            <>
              <p role="alert" className="text-muted-foreground">تعذّر التحقق من الدعوة.</p>
              <Button variant="outline" onClick={() => void invitation.refetch()}>حاول مرة أخرى</Button>
            </>
          ) : status !== 'pending' ? (
            <p className="text-muted-foreground">{inactiveMessage ?? 'رابط الدعوة غير صحيح أو مفقود'}</p>
          ) : user ? (
            result ? (
              <>
                <p role="alert" className="text-destructive">{result.error}</p>
                <Button variant="outline" onClick={() => void switchAccount()}>استخدم حسابًا آخر</Button>
              </>
            ) : (
              <p role="status" className="text-muted-foreground">جاري قبول الدعوة...</p>
            )
          ) : sent ? (
            <p role="status" className="text-muted-foreground">افتح رابط التأكيد الذي أرسلناه إلى بريدك لإكمال قبول الدعوة.</p>
          ) : (
            <>
              <p className="text-muted-foreground">أدخل بريد العمل اللي وصلته الدعوة، وهيوصلك رابط تأكيد لإكمال الانضمام.</p>
              <form className="space-y-3 text-start" onSubmit={sendConfirmation}>
                <Label htmlFor="invited-email">بريد العمل</Label>
                <Input id="invited-email" type="email" dir="ltr" autoComplete="email" value={email}
                  onChange={event => setEmail(event.target.value)} required disabled={sending} />
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? 'جارٍ الإرسال...' : 'متابعة قبول الدعوة'}
                </Button>
              </form>
            </>
          )}
          {emailError && <p role="alert" className="text-sm text-destructive">{emailError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  return <InvitationFlow key={token} token={token} />;
}
