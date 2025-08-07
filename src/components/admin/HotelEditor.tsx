import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { Hotel, useHotels } from '@/hooks/useHotels';
import { useDestinations } from '@/hooks/useDestinations';

interface HotelEditorProps {
  hotel?: Hotel;
  onSave?: (hotel: Hotel) => void;
  onCancel?: () => void;
}

export const HotelEditor: React.FC<HotelEditorProps> = ({
  hotel,
  onSave,
  onCancel,
}) => {
  const { addHotel, updateHotel } = useHotels();
  const { destinations } = useDestinations();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    destination_id: '',
    location: '',
    location_ar: '',
    image_url: '',
    rating: 5.0,
    star_rating: 5,
    features: [] as string[],
    features_ar: [] as string[],
    price_range: '',
    currency: 'EGP',
    is_featured: false,
    is_active: true,
    contact_info: {},
    meta_title: '',
    meta_description: '',
    sort_order: 0,
  });

  const [newFeature, setNewFeature] = useState('');
  const [newFeatureAr, setNewFeatureAr] = useState('');

  useEffect(() => {
    if (hotel) {
      setFormData({
        name: hotel.name || '',
        name_ar: hotel.name_ar || '',
        description: hotel.description || '',
        description_ar: hotel.description_ar || '',
        destination_id: hotel.destination_id || '',
        location: hotel.location || '',
        location_ar: hotel.location_ar || '',
        image_url: hotel.image_url || '',
        rating: hotel.rating || 5.0,
        star_rating: hotel.star_rating || 5,
        features: hotel.features || [],
        features_ar: hotel.features_ar || [],
        price_range: hotel.price_range || '',
        currency: hotel.currency || 'EGP',
        is_featured: hotel.is_featured || false,
        is_active: hotel.is_active !== undefined ? hotel.is_active : true,
        contact_info: hotel.contact_info || {},
        meta_title: hotel.meta_title || '',
        meta_description: hotel.meta_description || '',
        sort_order: hotel.sort_order || 0,
      });
    }
  }, [hotel]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addFeature = () => {
    if (newFeature.trim() && newFeatureAr.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
        features_ar: [...prev.features_ar, newFeatureAr.trim()],
      }));
      setNewFeature('');
      setNewFeatureAr('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
      features_ar: prev.features_ar.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let savedHotel;
      if (hotel) {
        savedHotel = await updateHotel(hotel.id, formData);
      } else {
        savedHotel = await addHotel(formData);
      }
      
      onSave?.(savedHotel);
    } catch (error) {
      console.error('Error saving hotel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {hotel ? 'تحرير الفندق' : 'إضافة فندق جديد'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">اسم الفندق (إنجليزي)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="name_ar">اسم الفندق (عربي)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => handleInputChange('name_ar', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Destination and Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="destination_id">الوجهة السياحية</Label>
              <Select value={formData.destination_id} onValueChange={(value) => handleInputChange('destination_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوجهة" />
                </SelectTrigger>
                <SelectContent>
                  {destinations.map((dest) => (
                    <SelectItem key={dest.id} value={dest.id}>
                      {dest.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">الموقع (إنجليزي)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="location_ar">الموقع (عربي)</Label>
              <Input
                id="location_ar"
                value={formData.location_ar}
                onChange={(e) => handleInputChange('location_ar', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">الوصف (إنجليزي)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="description_ar">الوصف (عربي)</Label>
              <Textarea
                id="description_ar"
                value={formData.description_ar}
                onChange={(e) => handleInputChange('description_ar', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Image Upload */}
          <ImageUploader
            value={formData.image_url}
            onChange={(url) => handleInputChange('image_url', url)}
            bucket="hotels"
            folder="hotels"
          />

          {/* Features */}
          <div className="space-y-4">
            <Label>مميزات الفندق</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="ميزة (إنجليزي)"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                />
                <Input
                  placeholder="ميزة (عربي)"
                  value={newFeatureAr}
                  onChange={(e) => setNewFeatureAr(e.target.value)}
                />
                <Button type="button" onClick={addFeature} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-2">
                  {feature} / {formData.features_ar[index]}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeFeature(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Ratings and Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="star_rating">تصنيف النجوم</Label>
              <Select value={formData.star_rating.toString()} onValueChange={(value) => handleInputChange('star_rating', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((stars) => (
                    <SelectItem key={stars} value={stars.toString()}>
                      {stars} نجوم
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rating">التقييم</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="price_range">نطاق السعر</Label>
              <Input
                id="price_range"
                placeholder="مثال: 200-500"
                value={formData.price_range}
                onChange={(e) => handleInputChange('price_range', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="currency">العملة</Label>
              <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                  <SelectItem value="EUR">يورو (EUR)</SelectItem>
                  <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                  <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sort_order">ترتيب العرض</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleInputChange('is_featured', checked)}
                />
                <Label htmlFor="is_featured">فندق مميز</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">نشط</Label>
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">تحسين محركات البحث (SEO)</h3>
            <div>
              <Label htmlFor="meta_title">عنوان SEO</Label>
              <Input
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) => handleInputChange('meta_title', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="meta_description">وصف SEO</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                إلغاء
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : (hotel ? 'تحديث' : 'إضافة')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};