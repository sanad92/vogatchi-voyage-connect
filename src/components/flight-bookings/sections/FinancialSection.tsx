
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { Control } from "react-hook-form";
import SupplierSelectionSection from "./SupplierSelectionSection";

interface FinancialSectionProps {
  control: Control<any>;
  selectedSupplier: { id: string; name: string } | null;
  onSupplierSelect: (supplierId: string, supplierName: string) => void;
  totalCost: number;
  totalProfit: number;
  watch: any;
}

const FinancialSection = ({ 
  control, 
  selectedSupplier, 
  onSupplierSelect, 
  totalCost, 
  totalProfit, 
  watch 
}: FinancialSectionProps) => {
  const ticketPrice = watch('ticket_price_per_person');
  const taxesAndFees = watch('taxes_and_fees') || 0;
  const numberOfPassengers = watch('number_of_passengers');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          المعلومات المالية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SupplierSelectionSection
          value={selectedSupplier?.id || ''}
          onChange={onSupplierSelect}
          label="المورد"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العملة</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العملة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EGP">جنيه مصري (ج.م)</SelectItem>
                    <SelectItem value="USD">دولار أمريكي ($)</SelectItem>
                    <SelectItem value="SAR">ريال سعودي (ر.س)</SelectItem>
                    <SelectItem value="EUR">يورو (€)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="ticket_price_per_person"
            render={({ field }) => (
              <FormItem>
                <FormLabel>سعر التذكرة للشخص الواحد</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="taxes_and_fees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الضرائب والرسوم</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="supplier_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تكلفة المورد</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="paid_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ المدفوع</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ملخص التكاليف */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-3">ملخص التكاليف:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">إجمالي التذاكر:</span>
              <div className="font-semibold">
                {(ticketPrice * numberOfPassengers).toFixed(2)} {watch('currency')}
              </div>
            </div>
            <div>
              <span className="text-gray-600">الضرائب والرسوم:</span>
              <div className="font-semibold">
                {taxesAndFees.toFixed(2)} {watch('currency')}
              </div>
            </div>
            <div>
              <span className="text-gray-600">إجمالي السعر:</span>
              <div className="font-semibold">
                {totalCost.toFixed(2)} {watch('currency')}
              </div>
            </div>
            <div>
              <span className="text-gray-600">الربح المتوقع:</span>
              <div className="font-semibold text-green-600">
                {totalProfit.toFixed(2)} {watch('currency')}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSection;
