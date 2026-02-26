import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch pending emails that are due
    const { data: pendingEmails, error } = await supabase
      .from("email_queue")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process each email by calling send-email function
    const results = await Promise.allSettled(
      pendingEmails.map(async (email) => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ email_id: email.id }),
        });
        const body = await res.text();
        return { id: email.id, status: res.status, body };
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Processed ${pendingEmails.length} emails: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ processed: pendingEmails.length, sent, failed }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Process queue error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
