
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import { calculateFinancialBreakdown } from '@/utils/calculationHelpers';

interface PaymentSectionProps {
  totalAmount: number;
  paidAmount: number;
  depositPaid?: number;
  securityDeposit?: number;
  paymentMethod: string;
  onPaidAmountChange: (amount: number) => void;
  onDepositPaidChange?: (amount: number) => void;
  onSecurityDepositChange?: (amount: number) => void;
  onPaymentMethodChange: (method: string) => void;
  currency?: string;
  showDeposit?: boolean;
}

const PaymentSection = ({
  totalAmount,
  paidAmount,
  depositPaid = 0,
  securityDeposit = 0,
  paymentMethod,
  onPaidAmountChange,
  onDepositPaidChange,
  onSecurityDepositChange,
  onPaymentMethodChange,
  currency = 'EGP',
  showDeposit = false
}: PaymentSectionProps) => {
  const financialBreakdown = calculateFinancialBreakdown({
    subtotal: totalAmount,
    paidAmount,
  });
  const remainingAmount = financialBreakdown.remainingAmount;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        معلومات الدفع
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paid_amount">المبلغ المدفوع ({currency})</Label>
          <Input
            type="number"
            id="paid_amount"
            value={paidAmount}
            onChange={(e) => onPaidAmountChange(Number(e.target.value))}
            min="0"
            max={totalAmount}
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="payment_method">طريقة الدفع</Label>
          <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
            <SelectTrigger>
              <SelectValue placeholder="اختر طريقة الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  نقداً
                </div>
              </SelectItem>
              <SelectItem value="bank_transfer">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  تحويل بنكي
                </div>
              </SelectItem>
              <SelectItem value="credit_card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  بطاقة ائتمانية
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showDeposit && onSecurityDepositChange && (
          <div>
            <Label htmlFor="security_deposit">مبلغ التأمين ({currency})</Label>
            <Input
              type="number"
              id="security_deposit"
              value={securityDeposit}
              onChange={(e) => onSecurityDepositChange(Number(e.target.value))}
              min="0"
              step="0.01"
            />
          </div>
        )}

        {showDeposit && onDepositPaidChange && (
          <div>
            <Label htmlFor="deposit_paid">التأمين المدفوع ({currency})</Label>
            <Input
              type="number"
              id="deposit_paid"
              value={depositPaid}
              onChange={(e) => onDepositPaidChange(Number(e.target.value))}
              min="0"
              max={securityDeposit}
              step="0.01"
            />
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ملخص الدفع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>إجمالي المبلغ:</span>
            <span className="font-medium">{totalAmount.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>المبلغ المدفوع:</span>
            <span className="font-medium text-green-600">{paidAmount.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span>المبلغ المتبقي:</span>
            <span className={`font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {remainingAmount.toLocaleString()} {currency}
            </span>
          </div>
          {showDeposit && securityDeposit > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span>مبلغ التأمين:</span>
                <span className="font-medium">{securityDeposit.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>التأمين المدفوع:</span>
                <span className="font-medium">{depositPaid.toLocaleString()} {currency}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSection;
