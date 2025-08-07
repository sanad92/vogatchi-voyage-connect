import React, { useState } from 'react';
import { useBlocks } from '@/hooks/useBlocksSimple';
import { BlockData, BlockType } from '@/types/blocks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  GripVertical,
  Settings
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const BlockManager = () => {
  const { blocks, isLoading, updateBlock, deleteBlock } = useBlocks();
  const [selectedBlock, setSelectedBlock] = useState<BlockData | null>(null);

  const getBlockTypeColor = (type: BlockType) => {
    const colors = {
      hero: 'bg-blue-500',
      services: 'bg-green-500',
      cities: 'bg-purple-500',
      hotels: 'bg-orange-500',
      contact: 'bg-red-500',
      direct_contracts: 'bg-yellow-500',
      custom_text: 'bg-gray-500',
      image_gallery: 'bg-pink-500',
      statistics: 'bg-teal-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getBlockTypeName = (type: BlockType) => {
    const names = {
      hero: 'البلوك الرئيسي',
      services: 'الخدمات',
      cities: 'المدن',
      hotels: 'الفنادق',
      contact: 'التواصل',
      direct_contracts: 'العقود المباشرة',
      custom_text: 'نص مخصص',
      image_gallery: 'معرض الصور',
      statistics: 'الإحصائيات',
    };
    return names[type] || type;
  };

  const toggleBlockStatus = (block: BlockData) => {
    updateBlock({
      ...block,
      is_active: !block.is_active
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">إدارة البلوكات</h1>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            إضافة بلوك جديد
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-8 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة البلوكات</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          إضافة بلوك جديد
        </Button>
      </div>

      <div className="grid gap-4">
        {blocks.map((block) => (
          <Card key={block.id} className={`transition-all duration-200 ${!block.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <Badge className={`${getBlockTypeColor(block.type)} text-white`}>
                    {getBlockTypeName(block.type)}
                  </Badge>
                  <CardTitle className="text-lg">{block.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={block.is_active}
                    onCheckedChange={() => toggleBlockStatus(block)}
                  />
                  {block.is_active ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    القسم: {block.section} • الترتيب: {block.order_index}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    آخر تحديث: {new Date(block.updated_at).toLocaleDateString('ar')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBlock(block)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    إعدادات
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBlock(block)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    تحرير
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        حذف
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف هذا البلوك؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteBlock(block.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {blocks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">لا توجد بلوكات متاحة</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              إضافة أول بلوك
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlockManager;