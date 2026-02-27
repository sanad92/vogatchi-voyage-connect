// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OnboardingRequest = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

const toSlug = (name: string): string => {
  const normalized = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return normalized || `org-${Date.now()}`;
};

const randomSuffix = (): string => Math.random().toString(36).slice(2, 6);

const isDuplicateError = (error: unknown): boolean => {
  const payload = String((error as { message?: string; code?: string })?.message || "").toLowerCase();
  const code = String((error as { code?: string })?.code || "").toLowerCase();

  return (
    code === "23505" ||
    payload.includes("duplicate") ||
    payload.includes("unique") ||
    payload.includes("slug")
  );
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as OnboardingRequest;
    const name = (body?.name || "").trim();

    if (!name) {
      return new Response(JSON.stringify({ error: "Organization name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = (body?.email || user.email || null)?.trim() || null;
    const phone = (body?.phone || null)?.trim?.() || null;
    const address = (body?.address || null)?.trim?.() || null;

    const baseSlug = toSlug(name);
    let organizationId: string | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      const slugCandidate = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`;

      const { data, error } = await supabase.rpc("create_organization_onboarding", {
        _name: name,
        _slug: slugCandidate,
        _phone: phone,
        _email: email,
        _address: address,
      });

      if (!error && data) {
        organizationId = data;
        break;
      }

      if (isDuplicateError(error)) {
        lastError = error;
        continue;
      }

      return new Response(JSON.stringify({ error: error?.message || "Onboarding failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!organizationId) {
      const errorMessage = isDuplicateError(lastError)
        ? "Could not generate unique organization slug"
        : ((lastError as { message?: string })?.message || "Onboarding failed");

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        organizationId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("create-organization-onboarding error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
