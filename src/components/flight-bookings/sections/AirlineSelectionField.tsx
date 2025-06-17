
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Plane } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AirlineSelectionFieldProps {
  value: string;
  onChange: (id: string) => void;
  airlines: any[];
}

const AirlineSelectionField = ({ value, onChange, airlines }: AirlineSelectionFieldProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAirlineData, setNewAirlineData] = useState({
    name: '',
    iata_code: ''
  });
  const queryClient = useQueryClient();

  const addAirlineMutation = useMutation({
    mutationFn: async (airlineData: any) => {
      const { data, error } = await supabase
        .from('airlines')
        .insert([{ ...airlineData, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      setShowAddDialog(false);
      setNewAirlineData({ name: '', iata_code: '' });
      toast.success('تم إضافة شركة الطيران بنجاح');
    },
    onError: () => {
      toast.error('فشل في إضافة شركة الطيران');
    }
  });

  const handleAddAirline = () => {
    if (!newAirlineData.name.trim()) {
      toast.error('اسم شركة الطيران مطلوب');
      return;
    }
    addAirlineMutation.mutate(newAirlineData);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Plane className="h-4 w-4" />
        شركة الطيران
      </Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="اختر شركة الطيران" />
          </SelectTrigger>
          <SelectContent>
            {airlines.map((airline) => (
              <SelectItem key={airline.id} value={airline.id}>
                {airline.name} {airline.iata_code && `(${airline.iata_code})`}
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
              <DialogTitle>إضافة شركة طيران جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم شركة الطيران *</Label>
                <Input
                  value={newAirlineData.name}
                  onChange={(e) => setNewAirlineData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم شركة الطيران"
                />
              </div>
              <div>
                <Label>كود IATA</Label>
                <Input
                  value={newAirlineData.iata_code}
                  onChange={(e) => setNewAirlineData(prev => ({ ...prev, iata_code: e.target.value.toUpperCase() }))}
                  placeholder="مثل: MS"
                  maxLength={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  إلغاء
                </Button>
                <Button 
                  type="button" 
                  onClick={handleAddAirline}
                  disabled={addAirlineMutation.isPending}
                >
                  {addAirlineMutation.isPending ? 'جاري الحفظ...' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AirlineSelectionField;
