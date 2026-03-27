import { useState } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Download, Trash2, Plus, Receipt, FileCheck, Palette,
  Search, Mail, MessageSquare, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { DocumentData, DocumentItem } from '@/utils/pdfGenerator';
import { generateDocumentPDF } from '@/utils/pdfGenerator';
import { useOrganization } from '@/contexts/OrganizationContext';

const DOC_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  invoice: { label: 'فاتورة', icon: Receipt, color: 'bg-blue-100 text-blue-700' },
  voucher: { label: 'إيصال حجز', icon: FileCheck, color: 'bg-emerald-100 text-emerald-700' },
  receipt: { label: 'إيصال دفع', icon: FileText, color: 'bg-amber-100 text-amber-700' },
};

const Documents = () => {
  const { documents, isLoading, generateAndSave, downloadDocument, deleteDocument, saveTemplate, getTemplate } = useDocuments();
  const { organization } = useOrganization();
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplateSettings, setShowTemplateSettings] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<DocumentData>>({
    documentType: 'invoice',
    documentNumber: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    currency: 'EGP',
    items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    subtotal: 0,
    totalAmount: 0,
    paidAmount: 0,
    paymentMethod: '',
  });

  const [templateForm, setTemplateForm] = useState({
    document_type: 'invoice',
    header_color: '#1a365d',
    accent_color: '#2b6cb0',
    footer_text: '',
    bank_details: '',
    terms_text: '',
    notes_text: '',
  });

  const items = (form.items || []) as DocumentItem[];

  const updateItem = (index: number, field: keyof DocumentItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }
    const subtotal = newItems.reduce((s, i) => s + i.total, 0);
    setForm(p => ({ ...p, items: newItems, subtotal, totalAmount: subtotal }));
  };

  const addItem = () => {
    setForm(p => ({
      ...p,
      items: [...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((s, i) => s + i.total, 0);
    setForm(p => ({ ...p, items: newItems, subtotal, totalAmount: subtotal }));
  };

  const handleGenerate = async () => {
    const docNumber = form.documentNumber || `DOC-${Date.now().toString(36).toUpperCase()}`;
    const docData: DocumentData = {
      documentType: (form.documentType || 'invoice') as any,
      documentNumber: docNumber,
      date: form.date || new Date().toISOString().split('T')[0],
      customerName: form.customerName || 'عميل',
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      companyName: organization?.name || 'Vogatchi Trips',
      companyPhone: organization?.phone || '',
      companyEmail: organization?.email || '',
      companyAddress: organization?.address || '',
      items: items,
      subtotal: form.subtotal || 0,
      totalAmount: form.totalAmount || 0,
      paidAmount: form.paidAmount,
      remainingAmount: (form.totalAmount || 0) - (form.paidAmount || 0),
      currency: form.currency || 'EGP',
      paymentMethod: form.paymentMethod,
      bookingReference: form.bookingReference,
      travelDate: form.travelDate,
      destination: form.destination,
      hotelName: form.hotelName,
    };

    generateAndSave.mutate(docData, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({
          documentType: 'invoice', documentNumber: '', date: new Date().toISOString().split('T')[0],
          customerName: '', customerPhone: '', customerEmail: '', currency: 'EGP',
          items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
          subtotal: 0, totalAmount: 0, paidAmount: 0, paymentMethod: '',
        });
      },
    });
  };

  const handlePreview = async () => {
    const docData: DocumentData = {
      documentType: (form.documentType || 'invoice') as any,
      documentNumber: form.documentNumber || 'PREVIEW',
      date: form.date || new Date().toISOString().split('T')[0],
      customerName: form.customerName || 'عميل',
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      companyName: organization?.name || 'Vogatchi Trips',
      companyPhone: organization?.phone || '',
      companyEmail: organization?.email || '',
      companyAddress: organization?.address || '',
      items: items,
      subtotal: form.subtotal || 0,
      totalAmount: form.totalAmount || 0,
      paidAmount: form.paidAmount,
      remainingAmount: (form.totalAmount || 0) - (form.paidAmount || 0),
      currency: form.currency || 'EGP',
      paymentMethod: form.paymentMethod,
      bookingReference: form.bookingReference,
      travelDate: form.travelDate,
      destination: form.destination,
      hotelName: form.hotelName,
    };
    const blob = await generateDocumentPDF(docData);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const filteredDocs = documents.filter(d => {
    if (filter !== 'all' && d.document_type !== filter) return false;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase()) && !d.document_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const loadTemplate = (type: string) => {
    const tmpl = getTemplate(type);
    if (tmpl) {
      setTemplateForm({
        document_type: type,
        header_color: tmpl.header_color || '#1a365d',
        accent_color: tmpl.accent_color || '#2b6cb0',
        footer_text: tmpl.footer_text || '',
        bank_details: tmpl.bank_details || '',
        terms_text: tmpl.terms_text || '',
        notes_text: tmpl.notes_text || '',
      });
    } else {
      setTemplateForm(p => ({ ...p, document_type: type }));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المستندات</h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة الفواتير وإيصالات الحجز والدفع</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadTemplate('invoice'); setShowTemplateSettings(true); }} className="gap-2">
            <Palette className="h-4 w-4" />
            إعدادات القوالب
          </Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            مستند جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['all', 'invoice', 'voucher', 'receipt'].map(type => {
          const count = type === 'all' ? documents.length : documents.filter(d => d.document_type === type).length;
          const label = type === 'all' ? 'الكل' : DOC_TYPES[type]?.label;
          return (
            <Card key={type} className={`cursor-pointer transition-all ${filter === type ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilter(type)}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الرقم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد مستندات</h3>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء مستند
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredDocs.map(doc => {
            const typeInfo = DOC_TYPES[doc.document_type] || DOC_TYPES.invoice;
            const Icon = typeInfo.icon;
            return (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">{doc.title}</h3>
                          <Badge variant="outline" className="text-xs">{doc.document_number}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {doc.customer_name} • {doc.total_amount?.toLocaleString()} {doc.currency}
                          {doc.created_at && ` • ${format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ar })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.sent_via_email && <Badge variant="secondary" className="text-xs gap-1"><Mail className="h-3 w-3" />إيميل</Badge>}
                      {doc.sent_via_whatsapp && <Badge variant="secondary" className="text-xs gap-1"><MessageSquare className="h-3 w-3" />واتساب</Badge>}
                      {doc.file_path && (
                        <Button variant="outline" size="sm" onClick={() => downloadDocument(doc.file_path!, `${doc.document_number}.pdf`)} className="gap-1">
                          <Download className="h-3 w-3" />
                          تحميل
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteDocument.mutate(doc.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Document Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>إنشاء مستند جديد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>نوع المستند</Label>
                <Select value={form.documentType} onValueChange={v => setForm(p => ({ ...p, documentType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">فاتورة</SelectItem>
                    <SelectItem value="voucher">إيصال حجز</SelectItem>
                    <SelectItem value="receipt">إيصال دفع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم المستند</Label>
                <Input value={form.documentNumber || ''} onChange={e => setForm(p => ({ ...p, documentNumber: e.target.value }))} placeholder="تلقائي" />
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={form.date || ''} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>اسم العميل</Label>
                <Input value={form.customerName || ''} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} />
              </div>
              <div>
                <Label>هاتف العميل</Label>
                <Input value={form.customerPhone || ''} onChange={e => setForm(p => ({ ...p, customerPhone: e.target.value }))} />
              </div>
              <div>
                <Label>إيميل العميل</Label>
                <Input value={form.customerEmail || ''} onChange={e => setForm(p => ({ ...p, customerEmail: e.target.value }))} />
              </div>
            </div>

            {form.documentType === 'voucher' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>الوجهة</Label>
                  <Input value={form.destination || ''} onChange={e => setForm(p => ({ ...p, destination: e.target.value }))} />
                </div>
                <div>
                  <Label>تاريخ السفر</Label>
                  <Input type="date" value={form.travelDate || ''} onChange={e => setForm(p => ({ ...p, travelDate: e.target.value }))} />
                </div>
                <div>
                  <Label>الفندق</Label>
                  <Input value={form.hotelName || ''} onChange={e => setForm(p => ({ ...p, hotelName: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>العناصر</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="h-3 w-3" />
                  إضافة
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {i === 0 && <Label className="text-xs">الوصف</Label>}
                      <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="وصف الخدمة" />
                    </div>
                    <div className="col-span-2">
                      {i === 0 && <Label className="text-xs">الكمية</Label>}
                      <Input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} min={1} />
                    </div>
                    <div className="col-span-2">
                      {i === 0 && <Label className="text-xs">السعر</Label>}
                      <Input type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} min={0} />
                    </div>
                    <div className="col-span-2">
                      {i === 0 && <Label className="text-xs">الإجمالي</Label>}
                      <Input value={item.total.toLocaleString()} readOnly className="bg-muted" />
                    </div>
                    <div className="col-span-1">
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>العملة</Label>
                <Select value={form.currency || 'EGP'} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EGP">EGP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المبلغ المدفوع</Label>
                <Input type="number" value={form.paidAmount || 0} onChange={e => setForm(p => ({ ...p, paidAmount: Number(e.target.value) }))} min={0} />
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Input value={form.paymentMethod || ''} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))} placeholder="كاش / تحويل / ..." />
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-lg font-bold text-foreground">
                الإجمالي: {(form.totalAmount || 0).toLocaleString()} {form.currency}
              </p>
              {(form.paidAmount || 0) > 0 && (
                <p className="text-sm text-muted-foreground">
                  المتبقي: {((form.totalAmount || 0) - (form.paidAmount || 0)).toLocaleString()} {form.currency}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button variant="secondary" onClick={handlePreview} className="gap-2">
              <Eye className="h-4 w-4" />
              معاينة
            </Button>
            <Button onClick={handleGenerate} disabled={!form.customerName || generateAndSave.isPending} className="gap-2">
              <FileText className="h-4 w-4" />
              {generateAndSave.isPending ? 'جاري الإنشاء...' : 'إنشاء وحفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
        <DialogContent className="max-w-4xl h-[85vh]">
          <DialogHeader>
            <DialogTitle>معاينة المستند</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full h-full rounded-lg border" title="PDF Preview" />
          )}
        </DialogContent>
      </Dialog>

      {/* Template Settings Dialog */}
      <Dialog open={showTemplateSettings} onOpenChange={setShowTemplateSettings}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إعدادات قوالب المستندات</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>نوع المستند</Label>
              <Select value={templateForm.document_type} onValueChange={v => loadTemplate(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">فاتورة</SelectItem>
                  <SelectItem value="voucher">إيصال حجز</SelectItem>
                  <SelectItem value="receipt">إيصال دفع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>لون الهيدر</Label>
                <div className="flex gap-2">
                  <Input type="color" value={templateForm.header_color} onChange={e => setTemplateForm(p => ({ ...p, header_color: e.target.value }))} className="w-12 h-10 p-1" />
                  <Input value={templateForm.header_color} onChange={e => setTemplateForm(p => ({ ...p, header_color: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>اللون الثانوي</Label>
                <div className="flex gap-2">
                  <Input type="color" value={templateForm.accent_color} onChange={e => setTemplateForm(p => ({ ...p, accent_color: e.target.value }))} className="w-12 h-10 p-1" />
                  <Input value={templateForm.accent_color} onChange={e => setTemplateForm(p => ({ ...p, accent_color: e.target.value }))} />
                </div>
              </div>
            </div>

            <div>
              <Label>نص الفوتر</Label>
              <Input value={templateForm.footer_text} onChange={e => setTemplateForm(p => ({ ...p, footer_text: e.target.value }))} placeholder="شكراً لتعاملكم معنا" />
            </div>

            <div>
              <Label>بيانات البنك</Label>
              <Textarea value={templateForm.bank_details} onChange={e => setTemplateForm(p => ({ ...p, bank_details: e.target.value }))} rows={3} placeholder="اسم البنك\nرقم الحساب\nIBAN" />
            </div>

            <div>
              <Label>الشروط والأحكام</Label>
              <Textarea value={templateForm.terms_text} onChange={e => setTemplateForm(p => ({ ...p, terms_text: e.target.value }))} rows={2} />
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea value={templateForm.notes_text} onChange={e => setTemplateForm(p => ({ ...p, notes_text: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateSettings(false)}>إلغاء</Button>
            <Button onClick={() => saveTemplate.mutate(templateForm)} disabled={saveTemplate.isPending}>
              {saveTemplate.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
