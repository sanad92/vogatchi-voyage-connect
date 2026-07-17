import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

export const DocumentsTab = ({ workspace }: Props) => {
  const navigate = useNavigate();
  const invoices = workspace.invoices || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">الفواتير</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate(`/invoices/new?booking_id=${workspace.booking?.id}`)}>
            فاتورة جديدة
          </Button>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد فواتير مرتبطة.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                  <div>
                    <p className="font-medium">{inv.invoice_number || inv.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(inv.total_amount || 0).toLocaleString()} {inv.currency}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices?id=${inv.id}`)}>
                    فتح <ExternalLink className="h-3 w-3 mr-1" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> مستندات الحجز
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            رفع المستندات (جوازات، تأشيرات، فاوتشرات) سيُتاح في مرحلة قادمة. حالياً يمكنك إدارة المستندات العامة من صفحة{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/documents')}>
              المستندات
            </Button>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
