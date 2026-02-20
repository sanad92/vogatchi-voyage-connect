import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Hotel {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  destination_id?: string;
  location: string;
  location_ar: string;
  image_url?: string;
  rating: number;
  star_rating: number;
  features: string[];
  features_ar: string[];
  price_range?: string;
  currency: string;
  is_featured: boolean;
  is_active: boolean;
  contact_info?: any;
  meta_title?: string;
  meta_description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useHotels = (destinationId?: string) => {
  const { toast } = useToast();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHotels = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('hotels')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const formattedHotels = (data || []).map((hotel: any) => ({
        ...hotel,
        features: Array.isArray(hotel.features) ? hotel.features.map(String) : [],
        features_ar: Array.isArray(hotel.features_ar) ? hotel.features_ar.map(String) : [],
        contact_info: typeof hotel.contact_info === 'object' ? hotel.contact_info : {},
      })) as Hotel[];
      
      setHotels(formattedHotels);
    } catch (err) {
      setError(err as Error);
      toast({
        title: 'خطأ في تحميل الفنادق',
        description: 'حدث خطأ أثناء تحميل بيانات الفنادق',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addHotel = async (hotel: Omit<Hotel, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .insert([hotel])
        .select()
        .single();

      if (error) throw error;

      const formattedHotel = {
        ...data,
        features: Array.isArray(data.features) ? data.features.map(String) : [],
        features_ar: Array.isArray(data.features_ar) ? data.features_ar.map(String) : [],
        contact_info: typeof data.contact_info === 'object' ? data.contact_info : {},
      } as Hotel;

      setHotels(prev => [...prev, formattedHotel]);
      toast({
        title: 'تم إضافة الفندق بنجاح',
        description: 'تم إضافة الفندق الجديد',
      });
      return data;
    } catch (err) {
      toast({
        title: 'خطأ في إضافة الفندق',
        description: 'حدث خطأ أثناء إضافة الفندق',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateHotel = async (id: string, updates: Partial<Hotel>) => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const formattedHotel = {
        ...data,
        features: Array.isArray(data.features) ? data.features.map(String) : [],
        features_ar: Array.isArray(data.features_ar) ? data.features_ar.map(String) : [],
        contact_info: typeof data.contact_info === 'object' ? data.contact_info : {},
      } as Hotel;

      setHotels(prev => prev.map(hotel => hotel.id === id ? formattedHotel : hotel));
      toast({
        title: 'تم تحديث الفندق بنجاح',
        description: 'تم حفظ التغييرات على الفندق',
      });
      return data;
    } catch (err) {
      toast({
        title: 'خطأ في تحديث الفندق',
        description: 'حدث خطأ أثناء تحديث الفندق',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteHotel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hotels')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setHotels(prev => prev.filter(hotel => hotel.id !== id));
      toast({
        title: 'تم حذف الفندق بنجاح',
        description: 'تم حذف الفندق',
      });
    } catch (err) {
      toast({
        title: 'خطأ في حذف الفندق',
        description: 'حدث خطأ أثناء حذف الفندق',
        variant: 'destructive',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [destinationId]);

  return {
    hotels,
    isLoading,
    error,
    addHotel,
    updateHotel,
    deleteHotel,
    refreshHotels: fetchHotels,
  };
};