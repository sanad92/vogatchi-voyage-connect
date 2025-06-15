
import CostCalculationSection from '@/components/shared/CostCalculationSection';
import PaymentSection from '@/components/shared/PaymentSection';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign } from 'lucide-react';

interface FlightPricingSectionProps {
  ticketPricePerPerson: number;
  supplierCost: number;
  taxesAndFees: number;
  totalCost: number;
  paidAmount: number;
  currency: string;
  paymentMethod: string;
  numberOfPassengers: number;
  onTicketPriceChange: (price: number) => void;
  onSupplierCostChange: (cost: number) => void;
  onTaxesFeesChange: (amount: number) => void;
  onPaidAmountChange: (amount: number) => void;
  onCurrencyChange: (currency: string) => void;
  onPaymentMethodChange: (method: string) => void;
  errors?: Record<string, string>;
}

const FlightPricingSection = ({
  ticketPricePerPerson,
  supplierCost,
  taxesAndFees,
  totalCost,
  paidAmount,
  currency,
  paymentMethod,
  numberOfPassengers,
  onTicketPriceChange,
  onSupplierCostChange,
  onTaxesFeesChange,
  onPaidAmountChange,
  onCurrencyChange,
  onPaymentMethodChange,
  errors = {}
}: FlightPricingSectionProps) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        التسعير والدفعات
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="currency">العملة</Label>
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
              <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
              <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
              <SelectItem value="EUR">يورو (EUR)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="ticket_price">سعر التذكرة للشخص الواحد</Label>
          <Input
            type="number"
            id="ticket_price"
            value={ticketPricePerPerson}
            onChange={(e) => onTicketPriceChange(Number(e.target.value))}
            step="0.01"
            required
          />
          {errors.ticket_price_per_person && (
            <p className="text-sm text-red-600 mt-1">{errors.ticket_price_per_person}</p>
          )}
        </div>

        <div>
          <Label htmlFor="taxes_fees">الضرائب والرسوم</Label>
          <Input
            type="number"
            id="taxes_fees"
            value={taxesAndFees}
            onChange={(e) => onTaxesFeesChange(Number(e.target.value))}
            step="0.01"
          />
        </div>

        <div>
          <Label htmlFor="supplier_cost">تكلفة المورد</Label>
          <Input
            type="number"
            id="supplier_cost"
            value={supplierCost}
            onChange={(e) => onSupplierCostChange(Number(e.target.value))}
            step="0.01"
            required
          />
        </div>
      </div>

      {/* Cost Calculation Display */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-3">ملخص التكاليف:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">سعر التذاكر:</span>
            <div className="font-semibold">
              {(ticketPricePerPerson * numberOfPassengers).toFixed(2)} {currency}
            </div>
          </div>
          <div>
            <span className="text-gray-600">الضرائب والرسوم:</span>
            <div className="font-semibold">
              {taxesAndFees.toFixed(2)} {currency}
            </div>
          </div>
          <div>
            <span className="text-gray-600">إجمالي السعر:</span>
            <div className="font-semibold">
              {totalCost.toFixed(2)} {currency}
            </div>
          </div>
          <div>
            <span className="text-gray-600">الربح المتوقع:</span>
            <div className="font-semibold text-green-600">
              {(totalCost - supplierCost).toFixed(2)} {currency}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <PaymentSection
        totalAmount={totalCost}
        paidAmount={paidAmount}
        paymentMethod={paymentMethod}
        onPaidAmountChange={onPaidAmountChange}
        onPaymentMethodChange={onPaymentMethodChange}
        currency={currency}
        showDeposit={false}
      />
    </div>
  );
};

export default FlightPricingSection;
