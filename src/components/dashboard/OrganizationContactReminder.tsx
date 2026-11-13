import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ContactRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgImpersonation } from '@/hooks/useOrgImpersonation';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { contactValidationError, normalizeContactPhone } from '@/lib/organizationContacts';
import { toast } from 'sonner';

export function OrganizationContactReminder() {
  const { user } = useOptimizedAuth();
  const { orgRole, currentOrganization } = useOrganization();
  const { isImpersonating } = useOrgImpersonation();
  const { dir } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', ownerPhone: '', phone: '', email: '' });
  const organizationId = currentOrganization?.id;
  const queryKey = ['organization-contact-reminder', user?.id, organizationId];

  const contacts = useQuery({
    queryKey,
    enabled: !!organizationId && !!user && orgRole === 'owner' && !isImpersonating,
    queryFn: async ({ signal }) => {
      const [profile, settings] = await Promise.all([
        supabase.from('profiles').select('full_name,phone').eq('id', user!.id).abortSignal(signal).maybeSingle(),
        supabase.from('organization_settings').select('phone,email').eq('organization_id', organizationId!).abortSignal(signal).maybeSingle(),
      ]);
      if (profile.error) throw profile.error;
      if (settings.error) throw settings.error;
      return {
        name: profile.data?.full_name?.trim() || '',
        ownerPhone: profile.data?.phone?.trim() || '',
        phone: settings.data?.phone?.trim() || currentOrganization?.phone?.trim() || '',
        email: settings.data?.email?.trim() || currentOrganization?.email?.trim() || '',
      };
    },
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Missing organization');
      const { error } = await supabase.rpc('complete_organization_contacts', {
        _organization_id: organizationId,
        _owner_name: form.name.trim(),
        _owner_phone: normalizeContactPhone(form.ownerPhone)!,
        _phone: normalizeContactPhone(form.phone)!,
        _email: form.email.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(queryKey, form);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ['organization-settings', organizationId] });
      void queryClient.invalidateQueries({ queryKey: ['current-organization', organizationId] });
      setOpen(false);
      toast.success('تم حفظ بيانات التواصل');
    },
    onError: () => toast.error('تعذّر حفظ بيانات التواصل. حاول مرة أخرى.'),
  });

  if (orgRole !== 'owner' || isImpersonating || !contacts.data) return null;
  const data = contacts.data;
  if (!contactValidationError(data.name, data.ownerPhone, data.phone, data.email)) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = contactValidationError(form.name, form.ownerPhone, form.phone, form.email);
    if (validation) return toast.error(validation);
    save.mutate();
  };

  return (
    <>
      <Alert className="flex flex-wrap items-center justify-between gap-3 [&>svg]:static [&>svg~*]:ps-0 [&>svg+div]:translate-y-0">
        <ContactRound className="h-4 w-4 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <AlertTitle>استكمل بيانات التواصل</AlertTitle>
          <AlertDescription>حدّث رقم مسؤول المؤسسة وبيانات الشركة عشان فريق SafarERP يقدر يتواصل معاك.</AlertDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setForm({ ...data, email: data.email || user?.email || '' });
          setOpen(true);
        }}>استكمال البيانات</Button>
      </Alert>
      <Dialog open={open} onOpenChange={(value) => { if (!save.isPending) setOpen(value); }}>
        <DialogContent dir={dir} className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>استكمل بيانات التواصل</DialogTitle>
            <DialogDescription>هنستخدم البيانات دي للتواصل مع مسؤول المؤسسة.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="complete-owner-name">اسم مسؤول المؤسسة *</Label>
              <Input id="complete-owner-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-owner-phone">موبايل مسؤول المؤسسة *</Label>
              <Input id="complete-owner-phone" type="tel" dir="ltr" value={form.ownerPhone} onChange={e => setForm({ ...form, ownerPhone: e.target.value })} required maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-company-phone">هاتف المؤسسة *</Label>
              <Input id="complete-company-phone" type="tel" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required maxLength={32} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-company-email">البريد الإلكتروني للشركة *</Label>
              <Input id="complete-company-email" type="email" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required maxLength={255} />
            </div>
            <Button type="submit" disabled={save.isPending}>حفظ بيانات التواصل</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
