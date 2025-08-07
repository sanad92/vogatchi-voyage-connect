import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Star } from 'lucide-react';
import { useDestinations, Destination } from '@/hooks/useDestinations';
import { DestinationEditor } from '@/components/admin/DestinationEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const DestinationsManager: React.FC = () => {
  const { destinations, isLoading, deleteDestination } = useDestinations();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredDestinations = destinations.filter(dest =>
    dest.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dest.country_ar.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (destination: Destination) => {
    setEditingDestination(destination);
    setShowEditor(true);
  };

  const handleAdd = () => {
    setEditingDestination(null);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingDestination(null);
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingDestination(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDestination(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting destination:', error);
    }
  };

  if (showEditor) {
    return (
      <DestinationEditor
        destination={editingDestination || undefined}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">إدارة الوجهات السياحية</h1>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة وجهة جديدة
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="البحث في الوجهات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Destinations Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <p>جاري تحميل الوجهات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map((destination) => (
            <Card key={destination.id} className="overflow-hidden">
              <div className="relative">
                {destination.image_url && (
                  <img
                    src={destination.image_url}
                    alt={destination.name_ar}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                  {destination.is_featured && (
                    <Badge variant="secondary" className="bg-yellow-500 text-white">
                      <Star className="w-3 h-3 ml-1" />
                      مميزة
                    </Badge>
                  )}
                  <Badge variant={destination.is_active ? 'default' : 'secondary'}>
                    {destination.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{destination.name_ar}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm">{destination.rating}</span>
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{destination.country_ar}</p>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {destination.description_ar}
                </p>
                
                {destination.attractions_ar.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium mb-2">المعالم السياحية:</p>
                    <div className="flex flex-wrap gap-1">
                      {destination.attractions_ar.slice(0, 3).map((attraction, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {attraction}
                        </Badge>
                      ))}
                      {destination.attractions_ar.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{destination.attractions_ar.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    ترتيب العرض: {destination.sort_order}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(destination)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(destination.id)}
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

      {filteredDestinations.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد وجهات سياحية</p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الوجهة السياحية؟ هذا الإجراء لا يمكن التراجع عنه.
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