import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Globe, Building2, ChevronsUpDown, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  showAddButton = false,
}: AirportSelectionFieldProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAirportData, setNewAirportData] = useState({
    name: '',
    city: '',
    country: '',
    iata_code: '',
  });
  const queryClient = useQueryClient();

  const selected = useMemo(
    () => airports.find((a) => a.id === value),
    [airports, value]
  );

  // Smart filter: search by name, city, IATA, country
  const filtered = useMemo(() => {
    if (!search.trim()) return airports.slice(0, 100); // limit initial render
    const q = search.trim().toLowerCase();
    return airports
      .filter((a) => {
        const haystack = `${a.name ?? ''} ${a.city ?? ''} ${a.iata_code ?? ''} ${a.country ?? ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 200); // cap results for performance
  }, [airports, search]);

  const addAirportMutation = useMutation({
    mutationFn: async (airportData: any) => {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('airports')
        .insert([{
          ...airportData,
          is_active: true,
          is_global: false,
          organization_id: orgMember?.organization_id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['airports'] });
      setShowAddDialog(false);
      setNewAirportData({ name: '', city: '', country: '', iata_code: '' });
      onChange(data.id);
      toast.success('تم إضافة المطار بنجاح');
    },
    onError: (e: any) => {
      toast.error(`فشل: ${e.message || 'خطأ غير معروف'}`);
    },
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between font-normal"
            >
              {selected ? (
                <span className="flex items-center gap-2 truncate">
                  {selected.is_global ? (
                    <Globe className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Building2 className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="truncate">
                    <strong>{selected.iata_code}</strong> — {selected.name}
                    {selected.city && ` (${selected.city})`}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">اختر {label}</span>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="ابحث بالاسم، المدينة، أو كود IATA..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-[320px]">
                <CommandEmpty>لا توجد نتائج.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((airport) => (
                    <CommandItem
                      key={airport.id}
                      value={airport.id}
                      onSelect={() => {
                        onChange(airport.id);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === airport.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {airport.is_global ? (
                        <Globe className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      ) : (
                        <Building2 className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
                            {airport.iata_code}
                          </Badge>
                          <span className="font-medium truncate">{airport.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {airport.city}
                          {airport.country && ` · ${airport.country}`}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
              {search.trim() && filtered.length === 200 && (
                <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                  عرض أول 200 نتيجة — حسّن البحث للمزيد
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>

        {showAddButton && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon" title="إضافة مطار خاص">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة مطار خاص بمؤسستك</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>اسم المطار *</Label>
                  <Input
                    value={newAirportData.name}
                    onChange={(e) => setNewAirportData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="أدخل اسم المطار"
                  />
                </div>
                <div>
                  <Label>المدينة *</Label>
                  <Input
                    value={newAirportData.city}
                    onChange={(e) => setNewAirportData((p) => ({ ...p, city: e.target.value }))}
                    placeholder="أدخل اسم المدينة"
                  />
                </div>
                <div>
                  <Label>الدولة</Label>
                  <Input
                    value={newAirportData.country}
                    onChange={(e) => setNewAirportData((p) => ({ ...p, country: e.target.value }))}
                    placeholder="أدخل اسم الدولة"
                  />
                </div>
                <div>
                  <Label>كود IATA</Label>
                  <Input
                    value={newAirportData.iata_code}
                    onChange={(e) =>
                      setNewAirportData((p) => ({ ...p, iata_code: e.target.value.toUpperCase() }))
                    }
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
