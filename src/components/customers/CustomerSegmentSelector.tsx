
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomerSegments } from "@/hooks/useCustomerSegments";
import { Controller, Control } from "react-hook-form";
import { CustomerData } from "@/types/customer";

interface CustomerSegmentSelectorProps {
  control: Control<CustomerData>;
  error?: string;
}

const CustomerSegmentSelector = ({ control, error }: CustomerSegmentSelectorProps) => {
  const { segments, isLoading } = useCustomerSegments();

  return (
    <div>
      <Label htmlFor="segment_id">تبويب العميل</Label>
      <Controller
        name="segment_id"
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value || ""}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="اختر تبويب العميل..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون تبويب</SelectItem>
              {isLoading ? (
                <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
              ) : (
                segments?.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      {segment.name_ar || segment.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default CustomerSegmentSelector;
