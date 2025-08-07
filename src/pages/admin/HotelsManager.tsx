import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Star, MapPin } from 'lucide-react';
import { useHotels, Hotel } from '@/hooks/useHotels';
import { useDestinations } from '@/hooks/useDestinations';
import { HotelEditor } from '@/components/admin/HotelEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const HotelsManager: React.FC = () => {
  const { hotels, isLoading, deleteHotel } = useHotels();
  const { destinations } = useDestinations();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = hotel.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.location_ar.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDestination = selectedDestination === 'all' || 
      hotel.destination_id === selectedDestination;
    
    return matchesSearch && matchesDestination;
  });

  const getDestinationName = (destinationId?: string) => {
    if (!destinationId) return 'غير محدد';
    const destination = destinations.find(d => d.id === destinationId);
    return destination?.name_ar || 'غير محدد';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: rating }, (_, i) => (
      <Star key={i} className="w-3 h-3 text-yellow-500 fill-current" />
    ));
  };

  const handleEdit = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setShowEditor(true);
  };

  const handleAdd = () => {
    setEditingHotel(null);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingHotel(null);
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingHotel(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHotel(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting hotel:', error);
    }
  };

  if (showEditor) {
    return (
      <HotelEditor
        hotel={editingHotel || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">إدارة الفنادق</h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة فندق جديد
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="البحث في الفنادق..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="جميع الوجهات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الوجهات</SelectItem>
            {destinations.map((dest) => (
              <SelectItem key={dest.id} value={dest.id}>
                {dest.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hotels Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <p>جاري تحميل الفنادق...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHotels.map((hotel) => (
            <Card key={hotel.id} className="overflow-hidden">
              <div className="relative">
                {hotel.image_url && (
                  <img
                    src={hotel.image_url}
                    alt={hotel.name_ar}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  {hotel.is_featured && (
                    <Badge variant="secondary" className="bg-yellow-500 text-white">
                      <Star className="w-3 h-3 ml-1" />
                      مميز
                    </Badge>
                  )}
                  <Badge variant={hotel.is_active ? 'default' : 'secondary'}>
                    {hotel.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
                <div className="absolute bottom-2 right-2">
                  <div className="flex items-center gap-1 bg-white/80 rounded px-2 py-1">
                    {renderStars(hotel.star_rating)}
                  </div>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="line-clamp-1">{hotel.name_ar}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm">{hotel.rating}</span>
                  </div>
                </CardTitle>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{hotel.location_ar}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getDestinationName(hotel.destination_id)}
                  </p>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {hotel.description_ar}
                </p>
                
                {hotel.features_ar.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium mb-2">المميزات:</p>
                    <div className="flex flex-wrap gap-1">
                      {hotel.features_ar.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {hotel.features_ar.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{hotel.features_ar.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {hotel.price_range && (
                  <div className="mb-4">
                    <p className="text-xs font-medium">نطاق السعر:</p>
                    <p className="text-sm">{hotel.price_range} {hotel.currency}</p>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    ترتيب العرض: {hotel.sort_order}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(hotel)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(hotel.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredHotels.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد فنادق</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الفندق؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};