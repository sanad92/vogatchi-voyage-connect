import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { Destination, useDestinations } from '@/hooks/useDestinations';

interface DestinationEditorProps {
  destination?: Destination;
  onSave?: (destination: Destination) => void;
  onCancel?: () => void;
}

export const DestinationEditor: React.FC<DestinationEditorProps> = ({
  destination,
  onSave,
  onCancel,
}) => {
  const { addDestination, updateDestination } = useDestinations();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    country: '',
    country_ar: '',
    image_url: '',
    rating: 5.0,
    attractions: [] as string[],
    attractions_ar: [] as string[],
    is_featured: false,
    is_active: true,
    meta_title: '',
    meta_description: '',
    sort_order: 0,
  });

  const [newAttraction, setNewAttraction] = useState('');
  const [newAttractionAr, setNewAttractionAr] = useState('');

  useEffect(() => {
    if (destination) {
      setFormData({
        name: destination.name || '',
        name_ar: destination.name_ar || '',
        description: destination.description || '',
        description_ar: destination.description_ar || '',
        country: destination.country || '',
        country_ar: destination.country_ar || '',
        image_url: destination.image_url || '',
        rating: destination.rating || 5.0,
        attractions: destination.attractions || [],
        attractions_ar: destination.attractions_ar || [],
        is_featured: destination.is_featured || false,
        is_active: destination.is_active !== undefined ? destination.is_active : true,
        meta_title: destination.meta_title || '',
        meta_description: destination.meta_description || '',
        sort_order: destination.sort_order || 0,
      });
    }
  }, [destination]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addAttraction = () => {
    if (newAttraction.trim() && newAttractionAr.trim()) {
      setFormData(prev => ({
        ...prev,
        attractions: [...prev.attractions, newAttraction.trim()],
        attractions_ar: [...prev.attractions_ar, newAttractionAr.trim()],
      }));
      setNewAttraction('');
      setNewAttractionAr('');
    }
  };

  const removeAttraction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attractions: prev.attractions.filter((_, i) => i !== index),
      attractions_ar: prev.attractions_ar.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let savedDestination;
      if (destination) {
        savedDestination = await updateDestination(destination.id, formData);
      } else {
        savedDestination = await addDestination(formData);
      }
      
      onSave?.(savedDestination);
    } catch (error) {
      console.error('Error saving destination:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {destination ? 'تحرير الوجهة السياحية' : 'إضافة وجهة سياحية جديدة'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">الاسم (إنجليزي)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="name_ar">الاسم (عربي)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => handleInputChange('name_ar', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">الدولة (إنجليزي)</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="country_ar">الدولة (عربي)</Label>
              <Input
                id="country_ar"
                value={formData.country_ar}
                onChange={(e) => handleInputChange('country_ar', e.target.value)}
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
            bucket="destinations"
            folder="destinations"
          />

          {/* Attractions */}
          <div className="space-y-4">
            <Label>المعالم السياحية</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-2">
                <Input
                  placeholder="معلم سياحي (إنجليزي)"
                  value={newAttraction}
                  onChange={(e) => setNewAttraction(e.target.value)}
                />
                <Input
                  placeholder="معلم سياحي (عربي)"
                  value={newAttractionAr}
                  onChange={(e) => setNewAttractionAr(e.target.value)}
                />
                <Button type="button" onClick={addAttraction} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.attractions.map((attraction, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-2">
                  {attraction} / {formData.attractions_ar[index]}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeAttraction(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label htmlFor="is_featured">وجهة مميزة</Label>
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
              {isLoading ? 'جاري الحفظ...' : (destination ? 'تحديث' : 'إضافة')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};