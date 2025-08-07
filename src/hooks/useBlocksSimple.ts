import { useState, useEffect } from 'react';
import { BlockData } from '@/types/blocks';
import { useToast } from '@/hooks/use-toast';

// مؤقتاً حتى يتم تحديث أنواع Supabase
export const useBlocks = (section?: string) => {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // البيانات التجريبية
    const mockBlocks: BlockData[] = [
      {
        id: '1',
        type: 'hero',
        title: 'البلوك الرئيسي',
        content: {
          main_title: 'اكتشف عالم السفر معنا',
          subtitle: 'رحلات استثنائية بأسعار منافسة',
          description: 'نحن نقدم لك أفضل تجربة سفر مع خدمات متميزة وأسعار تنافسية في جميع أنحاء العالم',
          primary_button_text: 'احجز الآن',
          primary_button_action: 'whatsapp',
          secondary_button_text: 'تصفح العروض',
          secondary_button_action: '/offers',
          stats: [
            { number: '1000+', label: 'عميل سعيد' },
            { number: '50+', label: 'وجهة سياحية' },
            { number: '5', label: 'سنوات خبرة' }
          ]
        },
        layout_settings: {
          container_width: 'container',
          padding_y: 'xl',
          padding_x: 'md',
          text_align: 'center'
        },
        style_settings: {},
        is_active: true,
        order_index: 1,
        section: 'landing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    setBlocks(section ? mockBlocks.filter(b => b.section === section) : mockBlocks);
    setIsLoading(false);
  }, [section]);

  const updateBlock = (block: Partial<BlockData> & { id: string }) => {
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, ...block } : b));
    toast({
      title: 'تم تحديث البلوك بنجاح',
      description: 'تم حفظ التغييرات بنجاح',
    });
  };

  const addBlock = (block: Omit<BlockData, 'id' | 'created_at' | 'updated_at'>) => {
    const newBlock: BlockData = {
      ...block,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setBlocks(prev => [...prev, newBlock]);
    toast({
      title: 'تم إضافة البلوك بنجاح',
      description: 'تم إنشاء البلوك الجديد بنجاح',
    });
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    toast({
      title: 'تم حذف البلوك بنجاح',
      description: 'تم حذف البلوك نهائياً',
    });
  };

  const reorderBlocks = (blocks: Array<{ id: string; order_index: number }>) => {
    setBlocks(prev => 
      prev.map(block => {
        const reorderedBlock = blocks.find(b => b.id === block.id);
        return reorderedBlock ? { ...block, order_index: reorderedBlock.order_index } : block;
      }).sort((a, b) => a.order_index - b.order_index)
    );
    toast({
      title: 'تم إعادة ترتيب البلوكات',
      description: 'تم حفظ الترتيب الجديد',
    });
  };

  return {
    blocks,
    isLoading,
    error,
    updateBlock,
    addBlock,
    deleteBlock,
    reorderBlocks,
    isUpdating: false,
    isAdding: false,
    isDeleting: false,
  };
};