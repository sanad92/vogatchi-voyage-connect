import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organizationName } = await req.json();

    // Queue welcome email
    const { error: queueError } = await supabase.from("email_queue").insert({
      email_type: "welcome",
      recipient_email: user.email!,
      recipient_name: user.user_metadata?.full_name || user.email,
      subject: `مرحباً بك في ${organizationName || "النظام"}! 🎉`,
      template_data: {
        user_name: user.user_metadata?.full_name || user.email,
        organization_name: organizationName || "",
        login_url: `${req.headers.get("origin") || supabaseUrl}/auth`,
      },
      status: "pending",
    });

    if (queueError) {
      console.error("Failed to queue welcome email:", queueError);
      // Don't fail the request - welcome email is non-critical
    }

    return new Response(
      JSON.stringify({ success: true, message: "Welcome email queued" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
