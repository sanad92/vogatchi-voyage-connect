
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AirportSelectionFieldProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  airports: any[];
  showAddButton?: boolean;
}

const AirportSelectionField = ({ 
  label, 
  value, 
  onChange, 
  airports, 
  showAddButton = false 
}: AirportSelectionFieldProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAirportData, setNewAirportData] = useState({
    name: '',
    city: '',
    country: '',
    iata_code: ''
  });
  const queryClient = useQueryClient();

  const addAirportMutation = useMutation({
    mutationFn: async (airportData: any) => {
      const { data, error } = await supabase
        .from('airports')
        .insert([{ ...airportData, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airports'] });
      setShowAddDialog(false);
      setNewAirportData({ name: '', city: '', country: '', iata_code: '' });
      toast.success('تم إضافة المطار بنجاح');
    },
    onError: () => {
      toast.error('فشل في إضافة المطار');
    }
  });

  const handleAddAirport = () => {
    if (!newAirportData.name.trim() || !newAirportData.city.trim()) {
      toast.error('اسم المطار والمدينة مطلوبان');
      return;
    }
    addAirportMutation.mutate(newAirportData);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
      </Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={`اختر ${label}`} />
          </SelectTrigger>
          <SelectContent>
            {airports.map((airport) => (
              <SelectItem key={airport.id} value={airport.id}>
                {airport.name} ({airport.iata_code}) - {airport.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {showAddButton && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة مطار جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>اسم المطار *</Label>
                  <Input
                    value={newAirportData.name}
                    onChange={(e) => setNewAirportData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="أدخل اسم المطار"
                  />
                </div>
                <div>
                  <Label>المدينة *</Label>
                  <Input
                    value={newAirportData.city}
                    onChange={(e) => setNewAirportData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="أدخل اسم المدينة"
                  />
                </div>
                <div>
                  <Label>الدولة</Label>
                  <Input
                    value={newAirportData.country}
                    onChange={(e) => setNewAirportData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="أدخل اسم الدولة"
                  />
                </div>
                <div>
                  <Label>كود IATA</Label>
                  <Input
                    value={newAirportData.iata_code}
                    onChange={(e) => setNewAirportData(prev => ({ ...prev, iata_code: e.target.value.toUpperCase() }))}
                    placeholder="مثل: CAI"
                    maxLength={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleAddAirport}
                    disabled={addAirportMutation.isPending}
                  >
                    {addAirportMutation.isPending ? 'جاري الحفظ...' : 'إضافة'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default AirportSelectionField;
