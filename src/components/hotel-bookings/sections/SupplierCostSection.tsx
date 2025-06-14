
import React from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewHotelBooking, HotelSupplier } from "@/types/hotelBooking";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface SupplierCostSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  suppliers: HotelSupplier[];
  totalCostCustomer: number;
  totalProfit: number;
}

const SupplierCostSection = ({
  register,
  setValue,
  errors,
  suppliers,
  totalCostCustomer,
  totalProfit
}: SupplierCostSectionProps) => {
  // تجهيز بيانات الموردين بطريقة تناسب مكون SearchableSelect
  const supplierOptions = suppliers.map((s) => ({
    value: s.name, // تستطيع استخدام id بدلاً من name حسب التصميم
    label: s.name,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>بيانات التكلفة والمورد</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="supplier_name">اسم المورد</Label>
          <SearchableSelect
            options={supplierOptions}
            value={''}
            onChange={val => setValue('supplier_name', String(val))}
            placeholder="اختر المورد..."
          />
          {errors.supplier_name && <p className="text-red-500 text-sm">{errors.supplier_name.message}</p>}
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="cost_per_night">تكلفة الليلة (ر.س)</Label>
            <Input type="number" step="0.01" {...register("cost_per_night")} />
            {errors.cost_per_night && <p className="text-red-500 text-sm">{errors.cost_per_night.message}</p>}
          </div>
          <div className="flex-1">
            <Label htmlFor="selling_price_per_night">سعر البيع للعميل (ر.س)</Label>
            <Input type="number" step="0.01" {...register("selling_price_per_night")} />
            {errors.selling_price_per_night && <p className="text-red-500 text-sm">{errors.selling_price_per_night.message}</p>}
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>إجمالي التكلفة للعميل</Label>
            <Input value={totalCostCustomer} disabled />
          </div>
          <div className="flex-1">
            <Label>الربح</Label>
            <Input value={totalProfit} disabled />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierCostSection;
