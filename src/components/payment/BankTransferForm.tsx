import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BanknoteIcon, Upload, CheckCircle2, Loader2, Copy } from 'lucide-react';

interface BankTransferFormProps {
  planId: string;
  planName: string;
  amount: number;
  billing: 'monthly' | 'yearly';
  onSuccess?: () => void;
}

const BANK_DETAILS = {
  bankName: 'البنك الأهلي المصري',
  accountName: 'Vogantra',
  accountNumber: '1234567890123',
  iban: 'EG12 0003 0004 0600 1234 5678 901',
  branch: 'فرع المعادي',
};

const BankTransferForm = ({ planId, planName, amount, billing, onSuccess }: BankTransferFormProps) => {
  const { user } = useOptimizedAuth();
  const orgId = useOrgId();
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !user) throw new Error('بيانات غير مكتملة');

      let receiptUrl: string | null = null;

      // Upload receipt if provided
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const path = `transfers/${orgId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(path, receiptFile);
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('bank_transfer_requests')
        .insert({
          organization_id: orgId,
          plan_id: planId,
          billing_cycle: billing,
          amount,
          currency: 'EGP',
          transfer_reference: reference || null,
          receipt_url: receiptUrl,
          notes: notes || null,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('تم إرسال طلب التحويل بنجاح');
      onSuccess?.();
    },
    onError: (err: any) => toast.error(err.message || 'فشل إرسال الطلب'),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
          <h3 className="text-xl font-bold text-foreground">تم إرسال طلبك بنجاح</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            سيتم مراجعة طلب التحويل البنكي من قبل الإدارة وتفعيل اشتراكك خلال 24-48 ساعة عمل.
          </p>
          <p className="text-sm text-muted-foreground">
            رقم المرجع: <strong>{reference || 'غير محدد'}</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bank Details Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BanknoteIcon className="h-5 w-5 text-primary" />
            بيانات الحساب البنكي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'اسم البنك', value: BANK_DETAILS.bankName },
            { label: 'اسم الحساب', value: BANK_DETAILS.accountName },
            { label: 'رقم الحساب', value: BANK_DETAILS.accountNumber },
            { label: 'IBAN', value: BANK_DETAILS.iban },
            { label: 'الفرع', value: BANK_DETAILS.branch },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-foreground">{item.value}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => copyToClipboard(item.value)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="bg-primary/5 rounded-lg p-3 text-sm text-primary font-medium">
            المبلغ المطلوب تحويله: {amount.toLocaleString('ar-EG')} ج.م
          </div>
        </CardContent>
      </Card>

      {/* Transfer Details Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">بيانات التحويل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>رقم مرجع التحويل *</Label>
            <Input
              placeholder="أدخل رقم مرجع التحويل البنكي"
              value={reference}
              onChange={e => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>إيصال التحويل (صورة أو PDF)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                className="hidden"
                id="receipt-upload"
              />
              <label htmlFor="receipt-upload" className="cursor-pointer space-y-2 block">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                {receiptFile ? (
                  <p className="text-sm text-primary font-medium">{receiptFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">اضغط لرفع إيصال التحويل</p>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات إضافية</Label>
            <Textarea
              placeholder="أي ملاحظات إضافية..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => submitMutation.mutate()}
            disabled={!reference.trim() || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري الإرسال...</>
            ) : (
              <><BanknoteIcon className="h-4 w-4 ml-2" /> إرسال طلب التحويل</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BankTransferForm;
