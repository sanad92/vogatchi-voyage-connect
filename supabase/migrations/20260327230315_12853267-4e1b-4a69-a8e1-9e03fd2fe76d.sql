
-- Storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can read own org documents" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete own org documents" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documents');

-- Generated documents tracking table
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  document_type text NOT NULL, -- invoice, voucher, receipt
  document_number text NOT NULL,
  title text NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  booking_id uuid,
  booking_type text,
  invoice_id uuid,
  file_url text,
  file_path text,
  total_amount numeric DEFAULT 0,
  currency text DEFAULT 'EGP',
  metadata jsonb DEFAULT '{}',
  sent_via_email boolean DEFAULT false,
  sent_via_whatsapp boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_generated_docs_org ON public.generated_documents(organization_id);
CREATE INDEX idx_generated_docs_type ON public.generated_documents(document_type);
CREATE INDEX idx_generated_docs_customer ON public.generated_documents(customer_id);

ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents for their org" ON public.generated_documents
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));

-- Document templates per organization
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) NOT NULL,
  document_type text NOT NULL, -- invoice, voucher, receipt
  template_name text NOT NULL DEFAULT 'default',
  header_color text DEFAULT '#1a365d',
  accent_color text DEFAULT '#2b6cb0',
  footer_text text,
  show_logo boolean DEFAULT true,
  show_bank_details boolean DEFAULT false,
  bank_details text,
  terms_text text,
  notes_text text,
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, document_type, template_name)
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage templates for their org" ON public.document_templates
  FOR ALL TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id))
  WITH CHECK (public.user_belongs_to_org(auth.uid(), organization_id));
