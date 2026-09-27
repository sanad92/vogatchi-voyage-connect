
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOrgId } from '@/hooks/useOrgId';

interface DynamicFormProps {
  formKey: string;
  onSuccess?: () => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ formKey, onSuccess }) => {
  const orgId = useOrgId();
  const { data: form } = useQuery({
    queryKey: ["dynamic-form", orgId, formKey],
    enabled: Boolean(orgId),
    queryFn: async () => {
      if (!orgId) return null;
      const { data: f, error: formErr } = await supabase
        .from("forms")
        .select("*")
        .eq("name", formKey)
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .maybeSingle();
      if (formErr) throw formErr;
      if (!f) return null;

      const { data: fields, error: fieldsErr } = await supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", f.id)
        .order("sort_order", { ascending: true });

      if (fieldsErr) throw fieldsErr;

      return { form: f, fields: (fields || []) as any[] };
    },
  });

  const { register, handleSubmit, reset } = useForm();

  const submitMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!form?.form) throw new Error("Form not loaded");
      if (!orgId || form.form.organization_id !== orgId) throw new Error('لا توجد مؤسسة مطابقة للنموذج');
      const payload = {
        form_id: form.form.id,
        organization_id: orgId,
        data: values,
        user_agent: typeof window !== "undefined" ? navigator.userAgent : undefined,
        ip_address: null, // backend will set if needed
        status: "received",
      };
      const { error } = await supabase.from("form_submissions").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(form?.form?.success_message || "تم الإرسال بنجاح");
      reset();
      onSuccess?.();
    },
    onError: (e: any) => {
      console.error("Form submit error:", e);
      toast.error(form?.form?.failure_message || "حدث خطأ أثناء الإرسال");
    },
  });

  if (!form) return null;
  if (!form.form) return <div className="text-muted-foreground">النموذج غير متوفر حالياً.</div>;

  return (
    <form
      onSubmit={handleSubmit((vals) => submitMutation.mutate(vals))}
      className="space-y-4"
    >
      {form.fields?.map((field: any) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.type === "textarea" ? (
            <Textarea
              id={field.name}
              placeholder={field.placeholder || ""}
              {...register(field.name, { required: field.required })}
            />
          ) : (
            <Input
              id={field.name}
              type={field.type === "number" ? "number" : field.type || "text"}
              placeholder={field.placeholder || ""}
              {...register(field.name, { required: field.required })}
            />
          )}
          {field.help_text && (
            <p className="text-xs text-muted-foreground">{field.help_text}</p>
          )}
        </div>
      ))}

      <Button type="submit" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? "جاري الإرسال..." : "إرسال"}
      </Button>
    </form>
  );
};

export default DynamicForm;
