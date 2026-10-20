import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldOff, Database, Table2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
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
  const { isSuperAdmin } = useOptimizedAuth();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: counts, isLoading } = useQuery({
    queryKey: ["platform-db-counts"],
    enabled: isSuperAdmin(),
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.all(
        CORE_TABLES.map(async (t) => {
          const { count, error } = await (supabase as any)
            .from(t.name)
            .select("*", { count: "exact", head: true });
          return [t.name, error ? null : count ?? 0] as const;
        })
      );
      return Object.fromEntries(results) as Record<string, number | null>;
    },
  });

  if (!isSuperAdmin()) {
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

  const filtered = CORE_TABLES.filter(
    (t) => t.name.includes(search.toLowerCase()) || t.description.includes(search)
  );

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">قاعدة البيانات</h2>
          <p className="text-sm text-muted-foreground">استعراض الجداول الأساسية وعدد السجلات الفعلي.</p>
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
          </div>
        </>
      )}
    </div>
  );
};

export default DatabaseManager;
