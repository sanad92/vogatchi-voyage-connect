import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import { generateDocumentPDF, type DocumentData } from '@/utils/pdfGenerator';

export function useDocuments() {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['generated-documents', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const templatesQuery = useQuery({
    queryKey: ['document-templates', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const getTemplate = (docType: string) => {
    const templates = templatesQuery.data || [];
    return templates.find(t => t.document_type === docType && t.is_default) || null;
  };

  const generateAndSave = useMutation({
    mutationFn: async (docData: DocumentData) => {
      if (!orgId) throw new Error('No organization');
      const { data: user } = await supabase.auth.getUser();

      // Apply template settings
      const template = getTemplate(docData.documentType);
      if (template) {
        docData.headerColor = template.header_color || docData.headerColor;
        docData.accentColor = template.accent_color || docData.accentColor;
        docData.footerText = template.footer_text || docData.footerText;
        docData.bankDetails = template.bank_details || docData.bankDetails;
        docData.termsText = template.terms_text || docData.termsText;
        docData.notesText = template.notes_text || docData.notesText;
      }

      // Generate PDF blob
      const blob = await generateDocumentPDF(docData);

      // Upload to storage
      const filePath = `${orgId}/${docData.documentType}/${docData.documentNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, { contentType: 'application/pdf', upsert: true });
      if (uploadErr) throw uploadErr;

      // Get signed URL (valid 7 days)
      const { data: urlData } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 7 * 24 * 3600);

      // Save record
      const { data: doc, error: docErr } = await supabase
        .from('generated_documents')
        .insert({
          organization_id: orgId,
          document_type: docData.documentType,
          document_number: docData.documentNumber,
          title: `${docData.documentType === 'invoice' ? 'فاتورة' : docData.documentType === 'voucher' ? 'إيصال حجز' : 'إيصال دفع'} - ${docData.customerName}`,
          customer_name: docData.customerName,
          file_url: urlData?.signedUrl || null,
          file_path: filePath,
          total_amount: docData.totalAmount,
          currency: docData.currency,
          metadata: {
            items: docData.items,
            bookingReference: docData.bookingReference,
          },
          created_by: user.user?.id || null,
        })
        .select()
        .single();
      if (docErr) throw docErr;

      return { doc, blob, url: urlData?.signedUrl };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-documents', orgId] });
      toast.success('تم إنشاء المستند بنجاح');
    },
    onError: (err: any) => toast.error(err.message || 'حدث خطأ في إنشاء المستند'),
  });

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('فشل في تحميل المستند');
    }
  };

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const doc = documentsQuery.data?.find(d => d.id === id);
      if (doc?.file_path) {
        await supabase.storage.from('documents').remove([doc.file_path]);
      }
      const { error } = await supabase.from('generated_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-documents', orgId] });
      toast.success('تم حذف المستند');
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async (input: {
      document_type: string;
      header_color?: string;
      accent_color?: string;
      footer_text?: string;
      bank_details?: string;
      terms_text?: string;
      notes_text?: string;
    }) => {
      if (!orgId) throw new Error('No org');
      const { error } = await supabase
        .from('document_templates')
        .upsert({
          organization_id: orgId,
          document_type: input.document_type,
          template_name: 'default',
          header_color: input.header_color,
          accent_color: input.accent_color,
          footer_text: input.footer_text,
          bank_details: input.bank_details,
          terms_text: input.terms_text,
          notes_text: input.notes_text,
          is_default: true,
        }, { onConflict: 'organization_id,document_type,template_name' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', orgId] });
      toast.success('تم حفظ إعدادات القالب');
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    templates: templatesQuery.data || [],
    getTemplate,
    generateAndSave,
    downloadDocument,
    deleteDocument,
    saveTemplate,
  };
}
