import { supabase } from "@/integrations/supabase/client";

type EmailType =
  | "welcome"
  | "booking_confirmation"
  | "invoice"
  | "subscription_activated"
  | "subscription_expiring"
  | "subscription_expired";

interface QueueEmailParams {
  organizationId: string;
  emailType: EmailType;
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  templateData: Record<string, any>;
  scheduledFor?: string; // ISO date string for delayed sending
}

export async function queueEmail({
  organizationId,
  emailType,
  recipientEmail,
  recipientName,
  subject,
  templateData,
  scheduledFor,
}: QueueEmailParams) {
  const { data, error } = await supabase.from("email_queue").insert({
    organization_id: organizationId,
    email_type: emailType,
    recipient_email: recipientEmail,
    recipient_name: recipientName || null,
    subject: subject || null,
    template_data: templateData,
    scheduled_for: scheduledFor || new Date().toISOString(),
  }).select("id").single();

  if (error) {
    console.error("Failed to queue email:", error);
    throw error;
  }

  return data;
}

// Convenience helpers

export const queueWelcomeEmail = (
  orgId: string,
  email: string,
  name: string,
  loginUrl: string
) =>
  queueEmail({
    organizationId: orgId,
    emailType: "welcome",
    recipientEmail: email,
    recipientName: name,
    templateData: { name, login_url: loginUrl },
  });

export const queueBookingConfirmation = (
  orgId: string,
  email: string,
  data: {
    customer_name: string;
    booking_reference: string;
    booking_type: string;
    date: string;
    amount: string;
    hotel_name?: string;
    destination?: string;
  }
) =>
  queueEmail({
    organizationId: orgId,
    emailType: "booking_confirmation",
    recipientEmail: email,
    recipientName: data.customer_name,
    templateData: data,
  });

export const queueInvoiceEmail = (
  orgId: string,
  email: string,
  data: {
    customer_name: string;
    invoice_number: string;
    total_amount: string;
    due_date: string;
    status?: string;
    items?: Array<{ description: string; amount: string }>;
  }
) =>
  queueEmail({
    organizationId: orgId,
    emailType: "invoice",
    recipientEmail: email,
    recipientName: data.customer_name,
    templateData: data,
  });

export const queueSubscriptionEmail = (
  orgId: string,
  email: string,
  type: "subscription_activated" | "subscription_expiring" | "subscription_expired",
  data: {
    org_name: string;
    plan_name: string;
    expires_at?: string;
    renew_url?: string;
    pricing_url?: string;
  }
) =>
  queueEmail({
    organizationId: orgId,
    emailType: type,
    recipientEmail: email,
    templateData: data,
  });
