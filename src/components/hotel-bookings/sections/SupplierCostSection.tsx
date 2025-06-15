
import React from "react";
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewHotelBooking, HotelSupplier, CURRENCY_OPTIONS, getCurrencySymbol } from "@/types/hotelBooking";
import SupplierSelection from "@/components/shared/SupplierSelection";
import CurrencySelector from "@/components/currency/CurrencySelector";
import { SupportedCurrency } from "@/types/currency";

interface SupplierCostSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  watch: UseFormWatch<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  suppliers: HotelSupplier[];
  totalCostCustomer: number;
  totalProfit: number;
}

const SupplierCostSection = ({
  register,
  setValue,
  watch,
  errors,
  suppliers,
  totalCostCustomer,
  totalProfit
}: SupplierCostSectionProps) => {
  const selectedSupplierName = watch('supplier_name');
  const selectedCurrency = watch('currency') || 'EGP';
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  const handleSupplierSelect = (supplierId: string, supplierName: string) => {
    setValue('supplier_id', supplierId);
    setValue('supplier_name', supplierName);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>بيانات التكلفة والمورد</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="currency">العملة</Label>
          <CurrencySelector
            value={selectedCurrency}
            onValueChange={(value) => setValue('currency', value)}
          />
        </div>

        <div>
          <SupplierSelection
            selectedSupplierId={watch('supplier_id')}
            selectedSupplierName={selectedSupplierName}
            onSupplierSelect={handleSupplierSelect}
            label="مورد الفندق"
            supplierType="hotel"
            required
          />
          {errors.supplier_name && <p className="text-red-500 text-sm">{errors.supplier_name.message}</p>}
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="cost_per_night">تكلفة الليلة ({currencySymbol})</Label>
            <Input 
              type="number" 
              step="0.01" 
              min="0.01"
              {...register("cost_per_night", {
                required: "تكلفة الليلة مطلوبة",
                min: { value: 0.01, message: "التكلفة يجب أن تكون أكبر من صفر" },
                valueAsNumber: true
              })} 
            />
            {errors.cost_per_night && <p className="text-red-500 text-sm">{errors.cost_per_night.message}</p>}
          </div>
          <div className="flex-1">
            <Label htmlFor="selling_price_per_night">سعر البيع للعميل ({currencySymbol})</Label>
            <Input 
              type="number" 
              step="0.01" 
              min="0.01"
              {...register("selling_price_per_night", {
                required: "سعر البيع مطلوب",
                min: { value: 0.01, message: "سعر البيع يجب أن يكون أكبر من صفر" },
                valueAsNumber: true
              })} 
            />
            {errors.selling_price_per_night && <p className="text-red-500 text-sm">{errors.selling_price_per_night.message}</p>}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Label>إجمالي التكلفة للعميل</Label>
            <Input 
              value={`${totalCostCustomer.toFixed(2)} ${currencySymbol}`} 
              disabled 
              className="bg-gray-50"
            />
          </div>
          <div className="flex-1">
            <Label>الربح</Label>
            <Input 
              value={`${totalProfit.toFixed(2)} ${currencySymbol}`} 
              disabled 
              className={`bg-gray-50 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierCostSection;
