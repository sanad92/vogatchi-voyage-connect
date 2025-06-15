
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

const PaymentMethodSelector = ({ 
  value, 
  onChange, 
  label = "طريقة الدفع", 
  required = false,
  className = ""
}: PaymentMethodSelectorProps) => {
  const paymentMethods = [
    { value: "cash", label: "نقداً", icon: "💰" },
    { value: "bank_transfer", label: "تحويل بنكي", icon: "🏦" },
    { value: "credit_card", label: "بطاقة ائتمان", icon: "💳" },
    { value: "check", label: "شيك", icon: "📝" },
    { value: "instant_transfer", label: "تحويل فوري", icon: "⚡" },
    { value: "mobile_payment", label: "دفع عبر الموبايل", icon: "📱" }
  ];

  return (
    <div className={className}>
      {label && (
        <Label htmlFor="payment_method">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="payment_method">
          <SelectValue placeholder="اختر طريقة الدفع" />
        </SelectTrigger>
        <SelectContent>
          {paymentMethods.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              <div className="flex items-center gap-2">
                <span>{method.icon}</span>
                <span>{method.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PaymentMethodSelector;
