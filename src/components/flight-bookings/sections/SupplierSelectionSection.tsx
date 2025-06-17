
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SupplierSelectionSectionProps {
  value: string;
  onChange: (supplierId: string, supplierName: string) => void;
  label?: string;
}

const SupplierSelectionSection = ({ value, onChange, label = "المورد" }: SupplierSelectionSectionProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', 'flight'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('type', 'flight')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (supplierData: { name: string; phone: string; email: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          phone: supplierData.phone,
          email: supplierData.email,
          type: 'flight',
          is_active: true
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', 'flight'] });
      onChange(data.id, data.name);
      setShowAddDialog(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      setNewSupplierEmail('');
      toast.success('تم إضافة المورد بنجاح');
    },
    onError: () => {
      toast.error('فشل في إضافة المورد');
    }
  });

  const handleAddSupplier = () => {
    if (!newSupplierName.trim()) {
      toast.error('اسم المورد مطلوب');
      return;
    }
    addSupplierMutation.mutate({
      name: newSupplierName,
      phone: newSupplierPhone,
      email: newSupplierEmail
    });
  };

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      onChange(supplierId, supplier.name);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={handleSupplierSelect}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="اختر المورد" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name} {supplier.phone && `- ${supplier.phone}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مورد جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم المورد *</Label>
                <Input
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="أدخل اسم المورد"
                />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="أدخل رقم الهاتف"
                />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  إلغاء
                </Button>
                <Button 
                  type="button" 
                  onClick={handleAddSupplier}
                  disabled={addSupplierMutation.isPending}
                >
                  {addSupplierMutation.isPending ? 'جاري الحفظ...' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SupplierSelectionSection;
