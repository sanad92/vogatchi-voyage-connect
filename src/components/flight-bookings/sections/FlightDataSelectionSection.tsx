
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Plane } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FlightDataSelectionSectionProps {
  departureAirportId: string;
  arrivalAirportId: string;
  airlineId: string;
  onDepartureAirportChange: (id: string) => void;
  onArrivalAirportChange: (id: string) => void;
  onAirlineChange: (id: string) => void;
}

const FlightDataSelectionSection = ({
  departureAirportId,
  arrivalAirportId,
  airlineId,
  onDepartureAirportChange,
  onArrivalAirportChange,
  onAirlineChange
}: FlightDataSelectionSectionProps) => {
  const [showAddAirportDialog, setShowAddAirportDialog] = useState(false);
  const [showAddAirlineDialog, setShowAddAirlineDialog] = useState(false);
  const [newAirportData, setNewAirportData] = useState({
    name: '',
    city: '',
    country: '',
    iata_code: ''
  });
  const [newAirlineData, setNewAirlineData] = useState({
    name: '',
    iata_code: ''
  });
  const queryClient = useQueryClient();

  const { data: airports = [] } = useQuery({
    queryKey: ['airports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: airlines = [] } = useQuery({
    queryKey: ['airlines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airlines')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

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
      setShowAddAirportDialog(false);
      setNewAirportData({ name: '', city: '', country: '', iata_code: '' });
      toast.success('تم إضافة المطار بنجاح');
    },
    onError: () => {
      toast.error('فشل في إضافة المطار');
    }
  });

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
      setShowAddAirlineDialog(false);
      setNewAirlineData({ name: '', iata_code: '' });
      toast.success('تم إضافة شركة الطيران بنجاح');
    },
    onError: () => {
      toast.error('فشل في إضافة شركة الطيران');
    }
  });

  const handleAddAirport = () => {
    if (!newAirportData.name.trim() || !newAirportData.city.trim()) {
      toast.error('اسم المطار والمدينة مطلوبان');
      return;
    }
    addAirportMutation.mutate(newAirportData);
  };

  const handleAddAirline = () => {
    if (!newAirlineData.name.trim()) {
      toast.error('اسم شركة الطيران مطلوب');
      return;
    }
    addAirlineMutation.mutate(newAirlineData);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* مطار المغادرة */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          مطار المغادرة
        </Label>
        <div className="flex gap-2">
          <Select value={departureAirportId} onValueChange={onDepartureAirportChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="اختر مطار المغادرة" />
            </SelectTrigger>
            <SelectContent>
              {airports.map((airport) => (
                <SelectItem key={airport.id} value={airport.id}>
                  {airport.name} ({airport.iata_code}) - {airport.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={showAddAirportDialog} onOpenChange={setShowAddAirportDialog}>
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
                  <Button type="button" variant="outline" onClick={() => setShowAddAirportDialog(false)}>
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
        </div>
      </div>

      {/* مطار الوصول */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          مطار الوصول
        </Label>
        <Select value={arrivalAirportId} onValueChange={onArrivalAirportChange}>
          <SelectTrigger>
            <SelectValue placeholder="اختر مطار الوصول" />
          </SelectTrigger>
          <SelectContent>
            {airports.map((airport) => (
              <SelectItem key={airport.id} value={airport.id}>
                {airport.name} ({airport.iata_code}) - {airport.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* شركة الطيران */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Plane className="h-4 w-4" />
          شركة الطيران
        </Label>
        <div className="flex gap-2">
          <Select value={airlineId} onValueChange={onAirlineChange}>
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
          
          <Dialog open={showAddAirlineDialog} onOpenChange={setShowAddAirlineDialog}>
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
                  <Button type="button" variant="outline" onClick={() => setShowAddAirlineDialog(false)}>
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
    </div>
  );
};

export default FlightDataSelectionSection;
