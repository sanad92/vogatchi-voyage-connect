import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Hotel as HotelIcon, Plus, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CITY_ALIASES } from "@/lib/travel-search-aliases";
import QuickAddHotelDialog from "./QuickAddHotelDialog";

interface HotelOption {
  id: string;
  name: string;
  star_rating: number | null;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  is_global?: boolean;
}

interface HotelComboboxProps {
  value?: string;
  hotelId?: string;
  onSelect: (hotel: { id?: string; name: string; star_rating?: number | null }) => void;
  placeholder?: string;
}

// Regional country codes prioritized at the top
const REGIONAL_CCS = new Set(['SA', 'AE', 'EG', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'TR', 'MA', 'TN', 'IQ']);

function expandQuery(q: string): string[] {
  const out = [q.toLowerCase()];
  for (const [ar, list] of Object.entries(CITY_ALIASES)) {
    if (q.includes(ar)) out.push(...list.map((s) => s.toLowerCase()));
  }
  return out;
}

const HotelCombobox = ({ value, hotelId, onSelect, placeholder = "ابحث أو اختر فندقاً..." }: HotelComboboxProps) => {
  const orgId = useOrgId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  // Org-owned hotels
  const { data: orgHotels = [] } = useQuery({
    queryKey: ['hotels-combobox-org', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<HotelOption[]> => {
      const { data } = await supabase
        .from('hotels')
        .select('id, name, star_rating, city, country, country_code')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('name');
      return (data || []).map((h) => ({ ...h, is_global: false }));
    },
  });

  // Global hotels (search-driven, server-side filter to keep payload small on a 1M+ table)
  const { data: globalHotels = [] } = useQuery({
    queryKey: ['hotels-combobox-global', query],
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<HotelOption[]> => {
      const terms = expandQuery(query.trim());
      // Build OR filter across name/city/country
      const orClauses = terms.flatMap((t) => [
        `name.ilike.%${t}%`,
        `city.ilike.%${t}%`,
        `country.ilike.%${t}%`,
      ]).join(',');
      const { data } = await supabase
        .from('hotels')
        .select('id, name, star_rating, city, country, country_code')
        .eq('is_global', true)
        .or(orClauses)
        .limit(200);
      return (data || []).map((h) => ({ ...h, is_global: true }));
    },
  });

  // Recent unique hotel names from past bookings
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

  const filteredOrg = useMemo(() => {
    if (!query) return orgHotels;
    const terms = expandQuery(query);
    return orgHotels.filter((h) =>
      terms.some((t) => h.name.toLowerCase().includes(t) || (h.city || '').toLowerCase().includes(t))
    );
  }, [orgHotels, query]);

  const sortedGlobal = useMemo(() => {
    return [...globalHotels].sort((a, b) => {
      const ra = REGIONAL_CCS.has((a.country_code || '').toUpperCase()) ? 0 : 1;
      const rb = REGIONAL_CCS.has((b.country_code || '').toUpperCase()) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return (b.star_rating || 0) - (a.star_rating || 0);
    });
  }, [globalHotels]);

  const registeredNames = new Set(orgHotels.map(h => h.name.toLowerCase()));
  const recentOnly = recentHotelNames.filter(n => !registeredNames.has(n.toLowerCase()));
  const display = value || "اختر فندقاً";

  return (
    <>
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
              placeholder="اكتب اسم الفندق أو المدينة (مثل: دبي، الرياض)..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {filteredOrg.length === 0 && sortedGlobal.length === 0 && recentOnly.length === 0 && (
                <CommandEmpty>
                  <div className="py-6 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {query
                        ? query.length < 2
                          ? "اكتب حرفين على الأقل للبحث في الفنادق العالمية"
                          : `لا يوجد فندق باسم "${query}"`
                        : "ابدأ بكتابة اسم فندق أو مدينة للبحث"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => { setOpen(false); setAddOpen(true); }}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      أضف فندق جديد
                    </Button>
                  </div>
                </CommandEmpty>
              )}

              {filteredOrg.length > 0 && (
                <CommandGroup heading="فنادق المؤسسة">
                  {filteredOrg.map(h => (
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
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {h.star_rating ? <span>{'⭐'.repeat(h.star_rating)}</span> : null}
                          {h.city && <span>{h.city}{h.country ? `، ${h.country}` : ''}</span>}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {sortedGlobal.length > 0 && (
                <CommandGroup heading="فنادق عالمية">
                  {sortedGlobal.slice(0, 100).map(h => (
                    <CommandItem
                      key={h.id}
                      value={h.id}
                      onSelect={() => {
                        onSelect({ id: h.id, name: h.name, star_rating: h.star_rating });
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Globe className="ml-2 h-3.5 w-3.5 text-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {h.name}
                          {h.star_rating ? <span className="text-xs">{'⭐'.repeat(h.star_rating)}</span> : null}
                        </div>
                        {(h.city || h.country) && (
                          <div className="text-xs text-muted-foreground">
                            {h.city}{h.city && h.country ? '، ' : ''}{h.country}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!query && recentOnly.length > 0 && (
                <CommandGroup heading="من حجوزات سابقة (نص حر)">
                  {recentOnly.slice(0, 6).map(name => (
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

              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__add_new_hotel__"
                  onSelect={() => { setOpen(false); setAddOpen(true); }}
                  className="text-primary font-medium"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة فندق جديد للمؤسسة {query && <>باسم "<strong className="mx-1">{query}</strong>"</>}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickAddHotelDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={query || value || ""}
        onCreated={(h) => {
          onSelect({ id: h.id, name: h.name, star_rating: h.star_rating });
          setQuery("");
        }}
      />
    </>
  );
};

export default HotelCombobox;
