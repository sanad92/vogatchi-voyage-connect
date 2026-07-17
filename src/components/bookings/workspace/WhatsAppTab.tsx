import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WindowStatusBadge } from '@/components/whatsapp/WindowStatusBadge';
import { useWhatsAppWindow } from '@/hooks/useWhatsAppWindow';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

export const WhatsAppTab = ({ workspace }: Props) => {
  const navigate = useNavigate();
  const convId = workspace.conversation?.id as string | undefined;
  const windowState = useWhatsAppWindow(convId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> محادثة العميل
          </CardTitle>
          {convId && <WindowStatusBadge state={windowState} />}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {workspace.conversation ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">آخر نشاط</p>
                  <p className="font-medium">
                    {workspace.conversation.last_message_at
                      ? new Date(workspace.conversation.last_message_at).toLocaleString('ar-EG')
                      : '—'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/whatsapp-admin?conversation=${convId}`)}
                >
                  <ExternalLink className="h-3 w-3 ml-1" /> فتح المحادثة الكاملة
                </Button>
              </div>
              {workspace.conversation.last_message_preview && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  {workspace.conversation.last_message_preview}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">لا توجد محادثة واتساب مرتبطة بهذا العميل بعد.</p>
              {workspace.customer?.phone && (
                <Button variant="outline" onClick={() => navigate(`/whatsapp-admin?phone=${workspace.customer?.phone}`)}>
                  بدء محادثة
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
