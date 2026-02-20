import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Destination {
  id: string;
  name: string;
  name_ar: string;
  description?: string;
  description_ar?: string;
  country: string;
  country_ar: string;
  image_url?: string;
  rating: number;
  attractions: string[];
  attractions_ar: string[];
  is_featured: boolean;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useDestinations = () => {
  const { toast } = useToast();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDestinations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const formattedDestinations = (data || []).map((dest: any) => ({
        ...dest,
        attractions: Array.isArray(dest.attractions) ? dest.attractions.map(String) : [],
        attractions_ar: Array.isArray(dest.attractions_ar) ? dest.attractions_ar.map(String) : [],
      })) as Destination[];
      
      setDestinations(formattedDestinations);
    } catch (err) {
      setError(err as Error);
      toast({
        title: 'خطأ في تحميل الوجهات',
        description: 'حدث خطأ أثناء تحميل بيانات الوجهات السياحية',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addDestination = async (destination: Omit<Destination, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .insert([destination])
        .select()
        .single();

      if (error) throw error;

      const formattedDestination = {
        ...data,
        attractions: Array.isArray(data.attractions) ? data.attractions.map(String) : [],
        attractions_ar: Array.isArray(data.attractions_ar) ? data.attractions_ar.map(String) : [],
      } as Destination;

      setDestinations(prev => [...prev, formattedDestination]);
      toast({
        title: 'تم إضافة الوجهة بنجاح',
        description: 'تم إضافة الوجهة السياحية الجديدة',
      });
      return data;
    } catch (err) {
      toast({
        title: 'خطأ في إضافة الوجهة',
        description: 'حدث خطأ أثناء إضافة الوجهة السياحية',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateDestination = async (id: string, updates: Partial<Destination>) => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const formattedDestination = {
        ...data,
        attractions: Array.isArray(data.attractions) ? data.attractions.map(String) : [],
        attractions_ar: Array.isArray(data.attractions_ar) ? data.attractions_ar.map(String) : [],
      } as Destination;

      setDestinations(prev => prev.map(dest => dest.id === id ? formattedDestination : dest));
      toast({
        title: 'تم تحديث الوجهة بنجاح',
        description: 'تم حفظ التغييرات على الوجهة السياحية',
      });
      return data;
    } catch (err) {
      toast({
        title: 'خطأ في تحديث الوجهة',
        description: 'حدث خطأ أثناء تحديث الوجهة السياحية',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteDestination = async (id: string) => {
    try {
      const { error } = await supabase
        .from('destinations')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setDestinations(prev => prev.filter(dest => dest.id !== id));
      toast({
        title: 'تم حذف الوجهة بنجاح',
        description: 'تم حذف الوجهة السياحية',
      });
    } catch (err) {
      toast({
        title: 'خطأ في حذف الوجهة',
        description: 'حدث خطأ أثناء حذف الوجهة السياحية',
        variant: 'destructive',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  return {
    destinations,
    isLoading,
    error,
    addDestination,
    updateDestination,
    deleteDestination,
    refreshDestinations: fetchDestinations,
  };
};