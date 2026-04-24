import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Truck, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import QuickAddSupplierDialog from "./QuickAddSupplierDialog";

interface SupplierOption {
  id: string;
  name: string;
  type: string | null;
}

interface Props {
  supplierId?: string;
  supplierName?: string;
  onSelect: (id: string, name: string) => void;
  supplierType?: string;
}

const HotelSupplierCombobox = ({ supplierId, supplierName, onSelect, supplierType = "hotel" }: Props) => {
  const orgId = useOrgId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["hotel-suppliers-combobox", orgId, supplierType],
    enabled: !!orgId,
    queryFn: async (): Promise<SupplierOption[]> => {
      let q = supabase
        .from("suppliers")
        .select("id, name, type")
        .eq("organization_id", orgId!)
        .eq("is_active", true)
        .order("name");
      const { data } = await q;
      const all = (data || []) as SupplierOption[];
      // فلترة بنوع الفنادق إن وُجد، وإلا اعرض الكل
      if (supplierType) {
        const filtered = all.filter((s) => (s.type || "").toLowerCase().includes(supplierType.toLowerCase()));
        return filtered.length > 0 ? filtered : all;
      }
      return all;
    },
  });

  const filtered = query
    ? suppliers.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : suppliers;

  const display = supplierName || "اختر المورد";

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
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{display}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 pointer-events-auto" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="ابحث عن مورد..." value={query} onValueChange={setQuery} />
            <CommandList>
              {filtered.length === 0 && (
                <CommandEmpty>
                  <span className="text-sm text-muted-foreground">لا يوجد موردون مطابقون</span>
                </CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup heading="الموردون">
                  {filtered.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.id}
                      onSelect={() => {
                        onSelect(s.id, s.name);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Check className={cn("ml-2 h-4 w-4", supplierId === s.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="font-medium">{s.name}</span>
                        {s.type && <Badge variant="outline" className="text-[10px]">{s.type}</Badge>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__add_new_supplier__"
                  onSelect={() => {
                    setOpen(false);
                    setAddOpen(true);
                  }}
                  className="text-primary font-medium"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة مورد جديد {query && <>باسم "<strong className="mx-1">{query}</strong>"</>}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <QuickAddSupplierDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={query}
        defaultType={supplierType}
        onCreated={(s) => {
          onSelect(s.id, s.name);
          setQuery("");
        }}
      />
    </>
  );
};

export default HotelSupplierCombobox;
