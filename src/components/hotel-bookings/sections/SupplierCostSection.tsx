import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { NewHotelBooking, HotelSupplier, getCurrencySymbol, PAYMENT_METHOD_OPTIONS } from "@/types/hotelBooking";
import SupplierSelection from "@/components/shared/SupplierSelection";
import CurrencySelector from "@/components/currency/CurrencySelector";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface SupplierCostSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  watch: UseFormWatch<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  suppliers: HotelSupplier[];
}

const SupplierCostSection = ({ register, setValue, watch, errors }: SupplierCostSectionProps) => {
  const orgId = useOrgId();
  const supplierId = watch('supplier_id');
  const supplierName = watch('supplier_name');
  const currency = watch('currency') || 'EGP';
  const symbol = getCurrencySymbol(currency);
  const checkIn = watch('check_in_date');
  const checkOut = watch('check_out_date');
  const costPerNight = Number(watch('cost_per_night')) || 0;
  const sellingPerNight = Number(watch('selling_price_per_night')) || 0;
  const rooms = Number(watch('number_of_rooms')) || 1;
  const additional = Number(watch('additional_costs')) || 0;
  const vat = Number(watch('vat_amount')) || 0;
  const vatIncluded = !!watch('vat_included');
  const commission = Number(watch('commission_amount')) || 0;
  const paid = Number(watch('paid_amount')) || 0;
  const dueDate = watch('payment_due_date');

  const nights = checkIn && checkOut
    ? Math.max(0, differenceInCalendarDays(new Date(checkOut), new Date(checkIn)))
    : 0;

  const totalCustomer = sellingPerNight * nights * rooms + additional + (vatIncluded ? 0 : vat);
  const totalCost = costPerNight * nights * rooms;
  const profit = totalCustomer - totalCost - commission;
  const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;
  const remaining = Math.max(0, totalCustomer - paid);

  const handleSupplierSelect = (id: string, name: string) => {
    setValue('supplier_id', id, { shouldValidate: true });
    setValue('supplier_name', name, { shouldValidate: true });
  };

  // Auto-fetch supplier rate
  const [fetchingRate, setFetchingRate] = useState(false);
  const fetchRate = async () => {
    if (!orgId || !supplierId || !checkIn) {
      toast.error('اختر المورد وتاريخ الوصول أولاً');
      return;
    }
    setFetchingRate(true);
    try {
      const { data, error } = await supabase.rpc('find_supplier_rate', {
        _org_id: orgId,
        _supplier_id: supplierId,
        _service_type: 'hotel',
        _service_date: checkIn,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        const r = data[0];
        if (r.cost_price) setValue('cost_per_night', Number(r.cost_price));
        if (r.selling_price) setValue('selling_price_per_night', Number(r.selling_price));
        if (r.currency) setValue('currency', r.currency as any);
        toast.success('تم جلب السعر من المورد');
      } else {
        toast.info('لا يوجد سعر مسجّل لهذا المورد في هذا التاريخ');
      }
    } catch (e: any) {
      toast.error(e.message || 'فشل جلب السعر');
    } finally {
      setFetchingRate(false);
    }
  };

  useEffect(() => {
    register('supplier_name', { required: 'مورد الفندق مطلوب' });
  }, [register]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>العملة</Label>
          <CurrencySelector value={currency} onValueChange={(v) => setValue('currency', v)} />
        </div>
        <div className="space-y-1.5">
          <Label>مورد الفندق *</Label>
          <SupplierSelection
            selectedSupplierId={supplierId}
            selectedSupplierName={supplierName}
            onSupplierSelect={handleSupplierSelect}
            label=""
            supplierType="hotel"
            required
          />
          {errors.supplier_name && <p className="text-destructive text-xs">{errors.supplier_name.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="cost_per_night">تكلفة الليلة من المورد ({symbol})</Label>
            <Button type="button" variant="ghost" size="sm" onClick={fetchRate} disabled={fetchingRate} className="h-7 text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              {fetchingRate ? 'جاري...' : 'جلب السعر'}
            </Button>
          </div>
          <Input
            id="cost_per_night" type="number" step="0.01" min="0"
            {...register("cost_per_night", { required: "مطلوب", min: 0, valueAsNumber: true })}
          />
          {errors.cost_per_night && <p className="text-destructive text-xs">{errors.cost_per_night.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="selling_price_per_night">سعر البيع للعميل / الليلة ({symbol})</Label>
          <Input
            id="selling_price_per_night" type="number" step="0.01" min="0"
            {...register("selling_price_per_night", { required: "مطلوب", min: 0, valueAsNumber: true })}
          />
          {errors.selling_price_per_night && <p className="text-destructive text-xs">{errors.selling_price_per_night.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="additional_costs">تكاليف إضافية ({symbol})</Label>
          <Input id="additional_costs" type="number" step="0.01" min="0" defaultValue={0}
            {...register('additional_costs', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vat_amount">قيمة الضريبة ({symbol})</Label>
          <Input id="vat_amount" type="number" step="0.01" min="0" defaultValue={0}
            {...register('vat_amount', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vat_included" className="block">السعر شامل الضريبة؟</Label>
          <div className="flex items-center h-10">
            <Switch id="vat_included" checked={vatIncluded}
              onCheckedChange={(c) => setValue('vat_included', c)} />
            <span className="text-sm text-muted-foreground mr-2">{vatIncluded ? 'نعم' : 'لا'}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commission_amount">عمولة الموظف ({symbol})</Label>
          <Input id="commission_amount" type="number" step="0.01" min="0" defaultValue={0}
            {...register('commission_amount', { valueAsNumber: true })} />
        </div>
      </div>

      {/* Live profit summary */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="الإجمالي للعميل" value={`${totalCustomer.toLocaleString()} ${symbol}`} />
        <Stat label="تكلفة المورد" value={`${totalCost.toLocaleString()} ${symbol}`} />
        <Stat
          label="صافي الربح"
          value={`${profit.toLocaleString()} ${symbol}`}
          tone={profit >= 0 ? 'positive' : 'negative'}
          icon={profit >= 0 ? TrendingUp : TrendingDown}
        />
        <Stat
          label="هامش الربح"
          value={`${margin.toFixed(1)}%`}
          tone={margin >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Payment & Status */}
      <div className="rounded-2xl border border-border/60 p-4 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">💳 الدفع وحالة الحجز</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="payment_method">طريقة الدفع</Label>
            <Select value={watch('payment_method') || ''} onValueChange={(v) => setValue('payment_method', v)}>
              <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paid_amount">المبلغ المدفوع ({symbol})</Label>
            <Input id="paid_amount" type="number" step="0.01" min="0" defaultValue={0}
              {...register('paid_amount', { valueAsNumber: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>المتبقي ({symbol})</Label>
            <Input value={remaining.toLocaleString()} disabled
              className={cn(remaining > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold')} />
          </div>
          <div className="space-y-1.5">
            <Label>تاريخ استحقاق الدفع</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start font-normal", !dueDate && "text-muted-foreground")}>
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {dueDate ? format(new Date(dueDate), 'dd MMM yyyy') : 'اختر تاريخ'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate ? new Date(dueDate) : undefined}
                  onSelect={(d) => setValue('payment_due_date', d ? format(d, 'yyyy-MM-dd') : undefined)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, tone, icon: Icon }: {
  label: string; value: string; tone?: 'positive' | 'negative'; icon?: any;
}) => (
  <div>
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className={cn(
      "text-base font-bold flex items-center gap-1",
      tone === 'positive' && 'text-emerald-600',
      tone === 'negative' && 'text-rose-600'
    )}>
      {Icon && <Icon className="h-4 w-4" />}
      {value}
    </div>
  </div>
);

export default SupplierCostSection;
