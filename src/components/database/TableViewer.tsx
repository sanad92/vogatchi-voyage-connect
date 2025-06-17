
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface TableViewerProps {
  table: string;
  onBack: () => void;
}

// دالة للحصول على أعمدة البيانات
function getColumns(obj: Record<string, any>): string[] {
  return Object.keys(obj);
}

const TableViewer = ({ table, onBack }: TableViewerProps) => {
  const [data, setData] = useState<any[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // استخدام الطريقة المباشرة لجلب البيانات
        const { data: result, error } = await supabase
          .from(table as any)
          .select("*")
          .limit(30);
        
        if (error) {
          console.error('Error fetching table data:', error);
          toast({ 
            title: "حدث خطأ", 
            description: error.message, 
            variant: "destructive" 
          });
          setData([]);
          setCols([]);
        } else if (result && Array.isArray(result) && result.length > 0) {
          setData(result);
          setCols(getColumns(result[0]));
        } else {
          setData([]);
          setCols([]);
        }
      } catch (err) {
        console.error('Error fetching table data:', err);
        toast({ 
          title: "حدث خطأ", 
          description: "فشل في جلب البيانات", 
          variant: "destructive" 
        });
        setData([]);
        setCols([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
    a.download = `${table}-export.csv`;
    a.click();
    toast({ title: "تم التصدير", description: "تم تصدير البيانات إلى CSV" });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border mt-3">
      <div className="flex items-center gap-2 mb-3">
        <Button variant="ghost" size="icon" onClick={onBack} title="رجوع للقائمة">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg flex-1">{table}</h2>
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
                  <th className="py-2 px-2 border-b bg-gray-50" key={col}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50 transition">
                  {cols.map(col => (
                    <td className="py-2 px-2 border-b" key={col}>
                      {String(row[col] ?? "")}
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
