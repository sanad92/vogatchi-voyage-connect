import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Hotel as HotelIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import QuickAddHotelDialog from "./QuickAddHotelDialog";

interface HotelOption {
  id: string;
  name: string;
  star_rating: number | null;
  city?: string | null;
}

interface HotelComboboxProps {
  value?: string; // hotel name (free text)
  hotelId?: string;
  onSelect: (hotel: { id?: string; name: string; star_rating?: number | null }) => void;
  placeholder?: string;
}

const HotelCombobox = ({ value, hotelId, onSelect, placeholder = "ابحث أو اختر فندقاً..." }: HotelComboboxProps) => {
  const orgId = useOrgId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: hotels = [] } = useQuery({
    queryKey: ['hotels-combobox', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<HotelOption[]> => {
      const { data } = await supabase
        .from('hotels')
        .select('id, name, star_rating')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Recent unique hotel names from past bookings (suggestions)
  const { data: recentHotelNames = [] } = useQuery({
    queryKey: ['recent-hotel-names', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from('hotel_bookings')
        .select('hotel_name')
        .eq('organization_id', orgId!)
        .not('hotel_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);
      const names = (data || []).map(r => r.hotel_name).filter(Boolean) as string[];
      return Array.from(new Set(names));
    },
  });

  const registeredNames = new Set(hotels.map(h => h.name.toLowerCase()));
  const recentOnly = recentHotelNames.filter(n => !registeredNames.has(n.toLowerCase()));

  const display = value || "اختر فندقاً";
  const filtered = query
    ? hotels.filter(h => h.name.toLowerCase().includes(query.toLowerCase()))
    : hotels;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <HotelIcon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{display}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 pointer-events-auto" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="اكتب اسم الفندق..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {query ? (
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-right hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    onSelect({ name: query });
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  استخدام "<strong>{query}</strong>" كاسم جديد
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">لا توجد فنادق مسجّلة</span>
              )}
            </CommandEmpty>

            {filtered.length > 0 && (
              <CommandGroup heading="فنادق مسجّلة">
                {filtered.map(h => (
                  <CommandItem
                    key={h.id}
                    value={h.id}
                    onSelect={() => {
                      onSelect({ id: h.id, name: h.name, star_rating: h.star_rating });
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check className={cn("ml-2 h-4 w-4", hotelId === h.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex-1">
                      <div className="font-medium">{h.name}</div>
                      {h.star_rating && (
                        <div className="text-xs text-muted-foreground">{'⭐'.repeat(h.star_rating)}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!query && recentOnly.length > 0 && (
              <CommandGroup heading="من حجوزات سابقة">
                {recentOnly.slice(0, 8).map(name => (
                  <CommandItem
                    key={name}
                    value={`recent-${name}`}
                    onSelect={() => {
                      onSelect({ name });
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check className="ml-2 h-4 w-4 opacity-0" />
                    <span className="text-sm">{name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default HotelCombobox;
