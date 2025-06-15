
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Plus, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupplierRatingsProps {
  supplierId?: string | null;
}

const SupplierRatings = ({ supplierId }: SupplierRatingsProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRating, setNewRating] = useState({
    supplier_id: supplierId || '',
    service_quality: 0,
    delivery_time: 0,
    price_competitiveness: 0,
    communication: 0,
    feedback: ''
  });

  // استعلام التقييمات
  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['supplier-ratings', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      
      const { data, error } = await supabase
        .from('supplier_ratings')
        .select(`
          *,
          suppliers(name)
        `)
        .eq('supplier_id', supplierId)
        .order('rating_date', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!supplierId
  });

  // إضافة تقييم جديد
  const addRatingMutation = useMutation({
    mutationFn: async (rating: typeof newRating) => {
      const overallRating = (
        rating.service_quality + 
        rating.delivery_time + 
        rating.price_competitiveness + 
        rating.communication
      ) / 4;

      const { data, error } = await supabase
        .from('supplier_ratings')
        .insert([{
          ...rating,
          overall_rating: overallRating,
          rating_date: new Date().toISOString(),
          rated_by: 'current_user' // يمكن تحديث هذا ليكون المستخدم الحالي
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ratings'] });
      setNewRating({
        supplier_id: supplierId || '',
        service_quality: 0,
        delivery_time: 0,
        price_competitiveness: 0,
        communication: 0,
        feedback: ''
      });
      setShowAddForm(false);
      toast({
        title: "تم إضافة التقييم بنجاح",
        description: "تم حفظ التقييم الجديد للمورد",
      });
    }
  });

  const renderRatingStars = (rating: number, onChange?: (value: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-6 h-6 cursor-pointer transition-colors ${
            i <= rating 
              ? 'text-yellow-400 fill-current' 
              : 'text-gray-300 hover:text-yellow-200'
          }`}
          onClick={() => onChange && onChange(i)}
        />
      );
    }
    return <div className="flex gap-1">{stars}</div>;
  };

  const calculateAverageRatings = () => {
    if (ratings.length === 0) return null;

    const averages = {
      service_quality: ratings.reduce((sum, r) => sum + r.service_quality, 0) / ratings.length,
      delivery_time: ratings.reduce((sum, r) => sum + r.delivery_time, 0) / ratings.length,
      price_competitiveness: ratings.reduce((sum, r) => sum + r.price_competitiveness, 0) / ratings.length,
      communication: ratings.reduce((sum, r) => sum + r.communication, 0) / ratings.length,
      overall: ratings.reduce((sum, r) => sum + r.overall_rating, 0) / ratings.length
    };

    return averages;
  };

  const averageRatings = calculateAverageRatings();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || newRating.service_quality === 0) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى إعطاء تقييم لجميع المعايير",
        variant: "destructive",
      });
      return;
    }
    addRatingMutation.mutate({
      ...newRating,
      supplier_id: supplierId
    });
  };

  if (!supplierId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">يرجى اختيار مورد لعرض التقييمات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* متوسط التقييمات */}
      {averageRatings && (
        <Card>
          <CardHeader>
            <CardTitle>متوسط التقييمات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <h4 className="font-medium mb-2">جودة الخدمة</h4>
                {renderRatingStars(Math.round(averageRatings.service_quality))}
                <p className="text-sm text-gray-600 mt-1">{averageRatings.service_quality.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <h4 className="font-medium mb-2">سرعة التسليم</h4>
                {renderRatingStars(Math.round(averageRatings.delivery_time))}
                <p className="text-sm text-gray-600 mt-1">{averageRatings.delivery_time.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <h4 className="font-medium mb-2">تنافسية السعر</h4>
                {renderRatingStars(Math.round(averageRatings.price_competitiveness))}
                <p className="text-sm text-gray-600 mt-1">{averageRatings.price_competitiveness.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <h4 className="font-medium mb-2">التواصل</h4>
                {renderRatingStars(Math.round(averageRatings.communication))}
                <p className="text-sm text-gray-600 mt-1">{averageRatings.communication.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <h4 className="font-medium mb-2">التقييم العام</h4>
                {renderRatingStars(Math.round(averageRatings.overall))}
                <p className="text-sm text-gray-600 mt-1">{averageRatings.overall.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* زر إضافة تقييم جديد */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">تقييمات المورد</h3>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة تقييم جديد
        </Button>
      </div>

      {/* نموذج إضافة تقييم */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة تقييم جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">جودة الخدمة</label>
                  {renderRatingStars(newRating.service_quality, (value) => 
                    setNewRating({...newRating, service_quality: value})
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">سرعة التسليم</label>
                  {renderRatingStars(newRating.delivery_time, (value) => 
                    setNewRating({...newRating, delivery_time: value})
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">تنافسية السعر</label>
                  {renderRatingStars(newRating.price_competitiveness, (value) => 
                    setNewRating({...newRating, price_competitiveness: value})
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">التواصل</label>
                  {renderRatingStars(newRating.communication, (value) => 
                    setNewRating({...newRating, communication: value})
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">ملاحظات وتعليقات</label>
                <Textarea
                  placeholder="اكتب ملاحظاتك وتعليقاتك حول المورد..."
                  value={newRating.feedback}
                  onChange={e => setNewRating({...newRating, feedback: e.target.value})}
                  rows={4}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={addRatingMutation.isPending}>
                  {addRatingMutation.isPending ? "جاري الحفظ..." : "حفظ التقييم"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* قائمة التقييمات */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-8">جاري تحميل التقييمات...</div>
        ) : ratings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد تقييمات لهذا المورد</p>
            </CardContent>
          </Card>
        ) : (
          ratings.map((rating) => (
            <Card key={rating.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="font-medium">{rating.rated_by}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      {renderRatingStars(Math.round(rating.overall_rating))}
                      <span className="font-bold">{rating.overall_rating.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(rating.rating_date).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm font-medium">جودة الخدمة</p>
                    {renderRatingStars(rating.service_quality)}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">سرعة التسليم</p>
                    {renderRatingStars(rating.delivery_time)}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">تنافسية السعر</p>
                    {renderRatingStars(rating.price_competitiveness)}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">التواصل</p>
                    {renderRatingStars(rating.communication)}
                  </div>
                </div>

                {rating.feedback && (
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm">{rating.feedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SupplierRatings;
