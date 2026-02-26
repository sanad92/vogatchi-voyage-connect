
import { useState } from 'react';
import { useInvitations, InvitationRole } from '@/hooks/useInvitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Clock, Check, X, RefreshCw, UserPlus, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const ROLE_LABELS: Record<InvitationRole, string> = {
  admin: 'مدير',
  manager: 'مشرف',
  agent: 'موظف',
  viewer: 'مشاهد',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'معلقة', variant: 'default' },
  accepted: { label: 'مقبولة', variant: 'secondary' },
  expired: { label: 'منتهية', variant: 'destructive' },
  cancelled: { label: 'ملغية', variant: 'outline' },
};

const InvitationManager = () => {
  const { invitations, isLoading, sendInvitation, cancelInvitation, resendInvitation } = useInvitations();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitationRole>('agent');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await sendInvitation.mutateAsync({ email: email.trim(), role });
    setEmail('');
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ رابط الدعوة');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Send invitation form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5" />
            دعوة عضو جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-email" className="sr-only">البريد الإلكتروني</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="أدخل البريد الإلكتروني"
                required
                disabled={sendInvitation.isPending}
                className="text-right"
              />
            </div>
            <div className="w-full sm:w-36">
              <Select value={role} onValueChange={(v) => setRole(v as InvitationRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={sendInvitation.isPending || !email.trim()}>
              <Mail className="w-4 h-4 ml-1" />
              {sendInvitation.isPending ? 'جاري الإرسال...' : 'إرسال دعوة'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Invitations list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الدعوات ({invitations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد دعوات بعد</div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv: any) => {
                const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                const isExpired = inv.status === 'pending' && new Date(inv.expires_at) < new Date();
                const displayStatus = isExpired ? STATUS_CONFIG.expired : status;

                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{inv.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[inv.role as InvitationRole] || inv.role}
                        </Badge>
                        <Badge variant={displayStatus.variant} className="text-xs">
                          {displayStatus.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          تنتهي: {format(new Date(inv.expires_at), 'dd MMM yyyy', { locale: ar })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mr-2">
                      {inv.status === 'pending' && !isExpired && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInviteLink(inv.token)}
                            title="نسخ الرابط"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelInvitation.mutate(inv.id)}
                            title="إلغاء"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {(inv.status === 'expired' || inv.status === 'cancelled' || isExpired) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resendInvitation.mutate(inv.id)}
                          title="إعادة إرسال"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                      {inv.status === 'accepted' && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitationManager;
