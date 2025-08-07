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
        layout_settings: { container_width: 'container', padding_y: 'xl', padding_x: 'md', text_align: 'center' },
        style_settings: {},
        is_active: true,
        order_index: 1,
        section: 'landing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        type: 'services',
        title: 'خدماتنا',
        content: {
          section_title: 'خدماتنا المتميزة',
          section_description: 'نقدم مجموعة شاملة من خدمات السفر والسياحة',
          services: [
            { id: '1', title: 'حجز الفنادق', description: 'أفضل الفنادق بأسعار مميزة', icon: 'Hotel', color: 'blue', button_text: 'احجز الآن', button_link: 'whatsapp' },
            { id: '2', title: 'حجز الطيران', description: 'تذاكر طيران لجميع الوجهات', icon: 'Plane', color: 'green', button_text: 'احجز الآن', button_link: 'whatsapp' },
            { id: '3', title: 'تأجير السيارات', description: 'سيارات مريحة وآمنة', icon: 'Car', color: 'red', button_text: 'احجز الآن', button_link: 'whatsapp' }
          ]
        },
        layout_settings: { container_width: 'container', padding_y: 'lg', padding_x: 'md', columns: 3 },
        style_settings: {},
        is_active: true,
        order_index: 2,
        section: 'landing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        type: 'direct_contracts',
        title: 'العقود المباشرة',
        content: {
          section_title: 'مميزات العقود المباشرة',
          section_description: 'نتعامل مباشرة مع الفنادق والموردين لضمان أفضل الأسعار',
          contracts: [
            { id: '1', title: 'أسعار مميزة', description: 'أفضل الأسعار في السوق', icon: 'Star', button_text: 'تواصل معنا' },
            { id: '2', title: 'ضمان الجودة', description: 'ضمان جودة الخدمة المقدمة', icon: 'Shield', button_text: 'تواصل معنا' }
          ]
        },
        layout_settings: { container_width: 'container', padding_y: 'lg', padding_x: 'md', columns: 2 },
        style_settings: {},
        is_active: true,
        order_index: 3,
        section: 'landing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '4',
        type: 'cities',
        title: 'الوجهات السياحية',
        content: {
          section_title: 'الوجهات السياحية الشائعة',
          section_description: 'اكتشف أجمل الوجهات السياحية حول العالم',
          explore_button_text: 'استكشف المزيد',
          destinations: [
            { id: '1', name: 'دبي', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800', rating: 5, attractions: ['برج خليفة', 'نافورة دبي', 'مول دبي'] },
            { id: '2', name: 'القاهرة', image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d5b770?w=800', rating: 5, attractions: ['الأهرامات', 'المتحف المصري', 'خان الخليلي'] }
          ]
        },
        layout_settings: { container_width: 'container', padding_y: 'lg', padding_x: 'md', columns: 2 },
        style_settings: {},
        is_active: true,
        order_index: 4,
        section: 'landing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        type: 'hotels',
        title: 'الفنادق المميزة',
        content: {
          section_title: 'فنادق القاهرة الفاخرة',
          section_description: 'تعرف على أفضل الفنادق الخمس نجوم في القاهرة',
          hotels: [
            { id: '1', name: 'فور سيزونز القاهرة', image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800', rating: 5, location: 'النيل - القاهرة', features: ['إطلالة على النيل', 'سبا فاخر', 'مطاعم متنوعة'] }
          ]
        },
        layout_settings: { container_width: 'container', padding_y: 'lg', padding_x: 'md', columns: 1 },
        style_settings: {},
        is_active: true,
        order_index: 5,
        section: 'landing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '6',
        type: 'contact',
        title: 'تواصل معنا',
        content: {
          section_title: 'تواصل معنا',
          section_description: 'نحن هنا للمساعدة، تواصل معنا الآن',
          form_fields: [
            { name: 'name', label: 'الاسم', type: 'text', required: true, placeholder: 'أدخل اسمك الكامل' },
            { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true, placeholder: 'أدخل بريدك الإلكتروني' },
            { name: 'message', label: 'الرسالة', type: 'textarea', required: true, placeholder: 'اكتب رسالتك هنا' }
          ],
          submit_button_text: 'إرسال الرسالة',
          success_message: 'تم إرسال رسالتك بنجاح'
        },
        layout_settings: { container_width: 'narrow', padding_y: 'lg', padding_x: 'md' },
        style_settings: {},
        is_active: true,
        order_index: 6,
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