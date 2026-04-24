import { useState } from 'react';
import { useJournalEntries, useJournalEntryLines } from '@/hooks/useAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const formatNumber = (n: number) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(n);

export default function JournalEntriesPage() {
  const { data: entries = [], isLoading } = useJournalEntries(200);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: lines = [] } = useJournalEntryLines(selectedId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          القيود المحاسبية
        </h1>
        <p className="text-muted-foreground mt-1">جميع القيود المرحّلة (تلقائية ويدوية)</p>
      </div>

      <Card>
        <CardHeader><CardTitle>آخر {entries.length} قيد</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">جارٍ التحميل...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القيد</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead className="text-left">المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-sm">{e.entry_number}</TableCell>
                    <TableCell>{format(new Date(e.entry_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                    <TableCell><Badge variant="outline">{e.reference_type || '—'}</Badge></TableCell>
                    <TableCell className="text-left font-medium">{formatNumber(e.total_debit)}</TableCell>
                    <TableCell>
                      <Badge className={e.status === 'posted' ? 'bg-green-500/10 text-green-700' : 'bg-gray-500/10'}>
                        {e.status === 'posted' ? 'مرحّل' : 'مسودة'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedId(e.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد قيود بعد. القيود تُنشأ تلقائياً عند إصدار فواتير أو مصروفات.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>تفاصيل القيد</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحساب</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead className="text-left">مدين</TableHead>
                <TableHead className="text-left">دائن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-mono text-xs text-muted-foreground">{l.account?.account_code}</div>
                    <div>{l.account?.account_name_ar || l.account?.account_name}</div>
                  </TableCell>
                  <TableCell className="text-sm">{l.description}</TableCell>
                  <TableCell className="text-left">{l.debit > 0 ? formatNumber(l.debit) : '—'}</TableCell>
                  <TableCell className="text-left">{l.credit > 0 ? formatNumber(l.credit) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
