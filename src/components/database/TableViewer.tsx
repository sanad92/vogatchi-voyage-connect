
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

// Correctly access Tables from Database type
type TableName = keyof Database["public"]["Tables"];

interface TableViewerProps {
  table: TableName;
  onBack: () => void;
}

// Only use string keys for columns
function getColumns(obj: Record<string, any>): string[] {
  return Object.keys(obj);
}

const TableViewer = ({ table, onBack }: TableViewerProps) => {
  const [data, setData] = useState<any[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Use the table name directly without type assertion
    supabase
      .from(table)
      .select("*")
      .limit(30)
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
        } else if (data && data.length > 0) {
          setData(data);
          setCols(getColumns(data[0]));
        } else {
          setData([]);
          setCols([]);
        }
        setLoading(false);
      });
  }, [table]);

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const csvRows = [
      cols.join(","),
      ...data.map(row =>
        cols.map(col => JSON.stringify(row[col] ?? "")).join(",")
      ),
    ];
    const csvString = csvRows.join("\n");
    const a = document.createElement("a");
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvString)}`;
    a.download = `${String(table)}-export.csv`;
    a.click();
    toast({ title: "تم التصدير", description: "تم تصدير البيانات إلى CSV" });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border mt-3">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" onClick={onBack} title="رجوع للقائمة">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg flex-1">{String(table)}</h2>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex gap-1 items-center">
          <Download className="h-4 w-4" /> تصدير CSV
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" /> جاري التحميل...
        </div>
      ) : data.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[500px] w-full border text-sm">
            <thead>
              <tr>
                {cols.map(col => (
                  <th className="py-2 px-2 border-b bg-gray-50" key={String(col)}>
                    {String(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50 transition">
                  {cols.map(col => (
                    <td className="py-2 px-2 border-b" key={String(col)}>
                      {typeof row[col] === "symbol"
                        ? String(row[col])
                        : String(row[col] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-gray-500">لا يوجد بيانات لعرضها.</div>
      )}
    </div>
  );
};

export default TableViewer;
