
import { useState, useEffect } from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { NewHotelBooking, SpecialRequestType } from "@/types/hotelBooking";

interface SpecialRequestsSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  selectedRequests: string[];
  onRequestsChange: (requests: string[]) => void;
}

const SpecialRequestsSection = ({ 
  register, 
  setValue, 
  errors,
  selectedRequests,
  onRequestsChange
}: SpecialRequestsSectionProps) => {
  const [specialRequests, setSpecialRequests] = useState<SpecialRequestType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('special_request_types')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setSpecialRequests(data || []);
      } catch (error) {
        console.error('Error fetching special requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialRequests();
  }, []);

  const groupedRequests = specialRequests.reduce((acc, request) => {
    if (!acc[request.category]) {
      acc[request.category] = [];
    }
    acc[request.category].push(request);
    return acc;
  }, {} as Record<string, SpecialRequestType[]>);

  const categoryLabels = {
    bed_type: 'نوع السرير',
    room_type: 'نوع الغرفة والموقع',
    amenities: 'وسائل الراحة والخدمات',
    accessibility: 'إمكانية الوصول',
    other: 'طلبات أخرى'
  };

  const handleRequestChange = (requestId: string, checked: boolean) => {
    let updatedRequests;
    if (checked) {
      updatedRequests = [...selectedRequests, requestId];
    } else {
      updatedRequests = selectedRequests.filter(id => id !== requestId);
    }
    onRequestsChange(updatedRequests);
    setValue('special_requests', updatedRequests);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>الطلبات الخاصة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">جاري تحميل الطلبات...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الطلبات الخاصة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedRequests).map(([category, requests]) => (
          <div key={category} className="space-y-3">
            <Label className="text-base font-semibold text-blue-800">
              {categoryLabels[category as keyof typeof categoryLabels] || category}
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={request.id}
                    checked={selectedRequests.includes(request.id)}
                    onCheckedChange={(checked) => 
                      handleRequestChange(request.id, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={request.id}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {request.name}
                    {request.has_extra_cost && request.extra_cost_amount > 0 && (
                      <span className="text-green-600 text-xs mr-1">
                        (+{request.extra_cost_amount} جنيه)
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="custom_request">طلبات إضافية (نص حر)</Label>
          <Textarea 
            id="custom_request"
            {...register('custom_request')}
            placeholder="أي طلبات خاصة أخرى..."
            rows={3}
          />
          {errors.custom_request && (
            <p className="text-red-500 text-sm">{errors.custom_request.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecialRequestsSection;
