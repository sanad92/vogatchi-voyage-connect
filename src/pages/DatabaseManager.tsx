import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldOff, Database, Table2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import TableViewer from "@/components/database/TableViewer";

const CORE_TABLES: { name: string; description: string }[] = [
  { name: "organizations", description: "الشركات المشتركة" },
  { name: "customers", description: "عملاء الشركات" },
  { name: "suppliers", description: "الموردون" },
  { name: "hotel_bookings", description: "حجوزات الفنادق" },
  { name: "flight_bookings", description: "حجوزات الطيران" },
  { name: "invoices", description: "الفواتير" },
  { name: "subscriptions", description: "الاشتراكات" },
  { name: "employee_commission_periods", description: "فترات العمولات" },
];

const DatabaseManager = () => {
  const { isPlatformAdmin, loading: roleLoading } = usePlatformAdmin();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: counts, isLoading, isError } = useQuery({
    queryKey: ["platform-db-counts"],
    enabled: !!isPlatformAdmin,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("platform_table_counts");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: any) => [r.table_name, Number(r.row_count)])) as Record<string, number>;
    },
  });

  if (roleLoading) return null;
  if (!isPlatformAdmin) {
    return (
      <div className="w-full px-4 md:px-6 py-10 flex justify-center items-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldOff className="h-6 w-6 mb-2" />
          <div className="font-bold mb-1 text-lg">صلاحية غير كافية</div>
          <div className="text-sm">هذه الصفحة متاحة لمديري المنصة فقط.</div>
        </Alert>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = CORE_TABLES.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.description.includes(search.trim())
  );

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">قاعدة البيانات</h2>
          <p className="text-sm text-muted-foreground">عدد السجلات الفعلي لكل جدول على مستوى كل الشركات.</p>
        </div>
        <Badge variant="outline" className="ms-auto border-accent/40 text-accent">مديرو المنصة فقط</Badge>
      </div>

      {selectedTable ? (
        <TableViewer table={selectedTable} onBack={() => setSelectedTable(null)} />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن جدول" className="ps-9" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((t) => {
              const c = counts?.[t.name];
              return (
                <Card key={t.name} className="hover:border-accent/50 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{t.description}</span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground" dir="ltr">{t.name}</div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-semibold tabular-nums text-foreground">
                        {isLoading ? "…" : c === null || c === undefined ? "—" : c.toLocaleString("en-US")}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelectedTable(t.name)}>تصفح</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!filtered.length && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-10">لا توجد جداول مطابقة للبحث</div>
            )}
          </div>
          {isError && <div className="text-sm text-destructive">تعذّر تحميل أعداد السجلات.</div>}
        </>
      )}
    </div>
  );
};

export default DatabaseManager;
