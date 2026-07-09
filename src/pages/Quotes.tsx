import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes } from '@/hooks/useQuotes';
import QuoteStatusBadge from '@/components/quotes/QuoteStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Search, Eye, Trash2, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import PageHeader from '@/components/layout/PageHeader';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Quotes() {
  usePageTitle('عروض الأسعار');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { quotes, totalCount, isLoading, deleteQuote } = useQuotes({ status, search, page, pageSize });
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeader
        title="عروض الأسعار"
        description="إنشاء وإدارة عروض الأسعار للعملاء"
        icon={FileSpreadsheet}
        actions={
          <Button onClick={() => navigate('/quotes/new')}>
            <Plus className="h-4 w-4 ml-1" />
            عرض سعر جديد
          </Button>
        }
      />


      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالرقم أو اسم العميل..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pr-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="sent">تم الإرسال</SelectItem>
                <SelectItem value="accepted">مقبول</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              لا توجد عروض أسعار
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم العرض</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>الوجهة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((q) => (
                      <TableRow key={q.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/quotes/${q.id}`)}>
                        <TableCell className="font-mono text-sm">{q.quote_number}</TableCell>
                        <TableCell>{q.customer_name || q.customers?.name || '—'}</TableCell>
                        <TableCell>{q.destination || '—'}</TableCell>
                        <TableCell><QuoteStatusBadge status={q.status} /></TableCell>
                        <TableCell className="font-semibold">{q.total_amount?.toLocaleString()} ج.م</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {q.created_at ? format(new Date(q.created_at), 'dd MMM yyyy', { locale: ar }) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" aria-label="عرض تفاصيل عرض السعر" onClick={() => navigate(`/quotes/${q.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {q.status === 'draft' && (
                              <Button variant="ghost" size="icon" aria-label="حذف عرض السعر" className="text-destructive" onClick={() => deleteQuote.mutate(q.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>

                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    صفحة {page} من {totalPages} ({totalCount} عرض)
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" aria-label="الصفحة السابقة" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" aria-label="الصفحة التالية" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
