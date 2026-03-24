import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      const authClient = createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
          global: { headers: { Authorization: authHeader } },
        }
      );
      const {
        data: { user },
        error: userError,
      } = await authClient.auth.getUser();

      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: pendingEmails, error } = await supabase
      .from("email_queue")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      throw error;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.allSettled(
      pendingEmails.map(async (email) => {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ email_id: email.id }),
        });

        return {
          id: email.id,
          status: response.status,
          body: await response.text(),
        };
      })
    );

    const sent = results.filter(
      (result) =>
        result.status === "fulfilled" &&
        result.value.status >= 200 &&
        result.value.status < 300
    ).length;
    const failed = results.length - sent;

    console.log(`Processed ${pendingEmails.length} emails: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ processed: pendingEmails.length, sent, failed }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Process queue error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
