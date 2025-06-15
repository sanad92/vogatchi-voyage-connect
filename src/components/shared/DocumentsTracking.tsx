
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Send, DollarSign, Calendar } from 'lucide-react';

interface DocumentsTrackingProps {
  contractSent: boolean;
  contractSentDate?: string;
  invoiceSent: boolean;
  invoiceSentDate?: string;
  supplierPaymentSent: boolean;
  supplierPaymentSentDate?: string;
  onContractSentChange: (sent: boolean) => void;
  onInvoiceSentChange: (sent: boolean) => void;
  onSupplierPaymentSentChange: (sent: boolean) => void;
  readonly?: boolean;
}

const DocumentsTracking = ({
  contractSent,
  contractSentDate,
  invoiceSent,
  invoiceSentDate,
  supplierPaymentSent,
  supplierPaymentSentDate,
  onContractSentChange,
  onInvoiceSentChange,
  onSupplierPaymentSentChange,
  readonly = false
}: DocumentsTrackingProps) => {
  const documents = [
    {
      id: 'contract',
      label: 'العقد',
      icon: FileText,
      sent: contractSent,
      sentDate: contractSentDate,
      onChange: onContractSentChange,
      color: 'blue'
    },
    {
      id: 'invoice',
      label: 'الفاتورة',
      icon: Send,
      sent: invoiceSent,
      sentDate: invoiceSentDate,
      onChange: onInvoiceSentChange,
      color: 'green'
    },
    {
      id: 'supplier_payment',
      label: 'دفع المورد',
      icon: DollarSign,
      sent: supplierPaymentSent,
      sentDate: supplierPaymentSentDate,
      onChange: onSupplierPaymentSentChange,
      color: 'orange'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          تتبع المستندات والمدفوعات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc) => {
          const Icon = doc.icon;
          return (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">{doc.label}</span>
                {!readonly && (
                  <Checkbox
                    checked={doc.sent}
                    onCheckedChange={doc.onChange}
                    className="data-[state=checked]:bg-green-600"
                  />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={doc.sent ? "default" : "secondary"}
                  className={doc.sent ? `bg-${doc.color}-600` : ''}
                >
                  {doc.sent ? "تم الإرسال" : "لم يتم الإرسال"}
                </Badge>
                
                {doc.sent && doc.sentDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.sentDate).toLocaleDateString('ar-SA')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Progress Summary */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span>التقدم الإجمالي:</span>
            <span className="font-medium">
              {documents.filter(d => d.sent).length}/{documents.length} مكتمل
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(documents.filter(d => d.sent).length / documents.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentsTracking;
