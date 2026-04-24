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
import { Plus, Plane, Globe, Building2, ChevronsUpDown, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AIRLINE_ALIASES, expandSearchTerm } from '@/lib/travel-search-aliases';

// Common Middle East / regional airline IATA codes — bubble these to the top of initial list
const REGIONAL_AIRLINES = new Set(['SV','EK','EY','QR','MS','KU','WY','GF','RJ','AT','TK','J9','G9','FZ','NE','NP','XY','3O','IY','AC']);

interface AirlineSelectionFieldProps {
  value: string;
  onChange: (id: string) => void;
  airlines: any[];
}

const AirlineSelectionField = ({ value, onChange, airlines }: AirlineSelectionFieldProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAirlineData, setNewAirlineData] = useState({ name: '', iata_code: '' });
  const queryClient = useQueryClient();

  const selected = useMemo(
    () => airlines.find((a) => a.id === value),
    [airlines, value]
  );

  const sortedAirlines = useMemo(() => {
    return [...airlines].sort((a, b) => {
      const aR = REGIONAL_AIRLINES.has(a.iata_code) ? 0 : 1;
      const bR = REGIONAL_AIRLINES.has(b.iata_code) ? 0 : 1;
      if (aR !== bR) return aR - bR;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [airlines]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedAirlines.slice(0, 200);
    const terms = expandSearchTerm(search, AIRLINE_ALIASES);
    return sortedAirlines
      .filter((a) => {
        const haystack = `${a.name ?? ''} ${a.iata_code ?? ''} ${a.country ?? ''}`.toLowerCase();
        return terms.some((t) => haystack.includes(t));
      })
      .slice(0, 200);
  }, [sortedAirlines, search]);

  const addAirlineMutation = useMutation({
    mutationFn: async (airlineData: any) => {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('airlines')
        .insert([{
          ...airlineData,
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
      queryClient.invalidateQueries({ queryKey: ['airlines'] });
      setShowAddDialog(false);
      setNewAirlineData({ name: '', iata_code: '' });
      onChange(data.id);
      toast.success('تم إضافة شركة الطيران بنجاح');
    },
    onError: (e: any) => {
      toast.error(`فشل: ${e.message || 'خطأ غير معروف'}`);
    },
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
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">اختر شركة الطيران</span>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="ابحث بالاسم أو كود IATA..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList className="max-h-[320px]">
                <CommandEmpty>لا توجد نتائج.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((airline) => (
                    <CommandItem
                      key={airline.id}
                      value={airline.id}
                      onSelect={() => {
                        onChange(airline.id);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          value === airline.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {airline.is_global ? (
                        <Globe className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      ) : (
                        <Building2 className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {airline.iata_code && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono">
                              {airline.iata_code}
                            </Badge>
                          )}
                          <span className="font-medium truncate">{airline.name}</span>
                        </div>
                        {airline.country && (
                          <div className="text-xs text-muted-foreground truncate">
                            {airline.country}
                          </div>
                        )}
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

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" title="إضافة شركة طيران خاصة">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة شركة طيران خاصة بمؤسستك</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم شركة الطيران *</Label>
                <Input
                  value={newAirlineData.name}
                  onChange={(e) => setNewAirlineData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="أدخل اسم شركة الطيران"
                />
              </div>
              <div>
                <Label>كود IATA</Label>
                <Input
                  value={newAirlineData.iata_code}
                  onChange={(e) =>
                    setNewAirlineData((p) => ({ ...p, iata_code: e.target.value.toUpperCase() }))
                  }
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
