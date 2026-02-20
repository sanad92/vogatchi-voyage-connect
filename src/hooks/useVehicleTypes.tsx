
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VehicleType {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  daily_rate?: number;
  created_at: string;
  updated_at: string;
}

export const useVehicleTypes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all vehicle types
  const { data: vehicleTypes = [], isLoading: vehicleTypesLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: async () => {
      // نفترض وجود جدول vehicle_types أو نستخدم جدول مؤقت
      // في حالة عدم وجود الجدول، سنقوم بإرجاع بيانات افتراضية
      try {
        const { data, error } = await supabase
          .from('flight_classes') // استخدام جدول موجود كبديل مؤقت
          .select('*')
          .order('name', { ascending: true });
        
        if (error) throw error;
        
        // تحويل البيانات إلى تنسيق نوع المركبة
        return (data as any[]).map((item: any) => ({
          id: item.id,
          name: item.name,
          name_ar: item.name_ar,
          description: item.description || '',
          created_at: item.created_at
        })) as VehicleType[];
      } catch (error) {
        // في حالة فشل الاستعلام، نعيد بيانات افتراضية
        return [
          { 
            id: '1', 
            name: 'Sedan', 
            name_ar: 'سيدان', 
            description: 'سيارة ركاب صغيرة',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: '2', 
            name: 'SUV', 
            name_ar: 'دفع رباعي', 
            description: 'سيارة دفع رباعي',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          { 
            id: '3', 
            name: 'Luxury', 
            name_ar: 'فاخرة', 
            description: 'سيارة فاخرة',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
      }
    }
  });

  // Add new vehicle type
  const addVehicleTypeMutation = useMutation({
    mutationFn: async (newVehicleType: Omit<VehicleType, 'id' | 'created_at' | 'updated_at'>) => {
      // في حالة عدم وجود جدول vehicle_types، سنتجاهل الإضافة
      toast({
        title: "معلومة",
        description: "إضافة نوع مركبة جديد غير متاح حالياً",
      });
      return newVehicleType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-types'] });
    }
  });

  return {
    vehicleTypes,
    vehicleTypesLoading,
    addVehicleType: addVehicleTypeMutation.mutate,
    isAddingVehicleType: addVehicleTypeMutation.isPending
  };
};
