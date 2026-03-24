import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'manager', 'sales_agent', 'accountant', 'viewer', 'super_admin'] as const;

async function checkSuperAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc('has_platform_role', { _user_id: userId, _role: 'platform_admin' });
  if (data) return true;
  
  // Also check org-level super_admin
  const { data: members } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['owner', 'super_admin']);
  
  return members && members.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin privileges
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const isAdmin = await checkSuperAdmin(supabase, user.id);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create_user": {
        const { email, password, full_name, department, phone, role } = body;

        // Validate inputs
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.length > 255) {
          return new Response(JSON.stringify([{ success: false, message: "بريد إلكتروني غير صالح" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
          return new Response(JSON.stringify([{ success: false, message: "كلمة المرور يجب أن تكون بين 8 و 128 حرف" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0 || full_name.length > 200) {
          return new Response(JSON.stringify([{ success: false, message: "الاسم الكامل مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (role && !VALID_ROLES.includes(role)) {
          return new Response(JSON.stringify([{ success: false, message: "دور المستخدم غير صالح" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create user via Supabase Admin API
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name.trim(),
            department: department?.trim() || null,
            phone: phone?.trim() || null,
          },
        });

        if (createError) {
          return new Response(JSON.stringify([{ success: false, message: createError.message }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile with role info
        if (newUser?.user) {
          await supabase
            .from('profiles')
            .update({
              full_name: full_name.trim(),
              department: department?.trim() || null,
              phone: phone?.trim() || null,
              role: role || 'viewer',
            })
            .eq('id', newUser.user.id);
        }

        return new Response(JSON.stringify([{ success: true, user_id: newUser.user.id, message: "تم إنشاء المستخدم بنجاح" }]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id, new_password } = body;

        if (!user_id || typeof user_id !== 'string') {
          return new Response(JSON.stringify([{ success: false, message: "معرف المستخدم مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!new_password || typeof new_password !== 'string' || new_password.length < 8 || new_password.length > 128) {
          return new Response(JSON.stringify([{ success: false, message: "كلمة المرور يجب أن تكون بين 8 و 128 حرف" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: resetError } = await supabase.auth.admin.updateUserById(user_id, {
          password: new_password,
        });

        if (resetError) {
          return new Response(JSON.stringify([{ success: false, message: resetError.message }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify([{ success: true, message: "تم إعادة تعيين كلمة المرور بنجاح" }]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_profile": {
        const { user_id, email: newEmail, full_name, department, phone, is_active } = body;

        if (!user_id || typeof user_id !== 'string') {
          return new Response(JSON.stringify([{ success: false, message: "معرف المستخدم مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update auth user if email changed
        if (newEmail && typeof newEmail === 'string' && EMAIL_REGEX.test(newEmail.trim())) {
          const { error: authUpdateError } = await supabase.auth.admin.updateUserById(user_id, {
            email: newEmail.trim(),
          });
          if (authUpdateError) {
            return new Response(JSON.stringify([{ success: false, message: authUpdateError.message }]), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Update profile
        const profileUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (full_name !== undefined) profileUpdates.full_name = typeof full_name === 'string' ? full_name.trim() : null;
        if (department !== undefined) profileUpdates.department = typeof department === 'string' ? department.trim() : null;
        if (phone !== undefined) profileUpdates.phone = typeof phone === 'string' ? phone.trim() : null;
        if (is_active !== undefined) profileUpdates.is_active = Boolean(is_active);
        if (newEmail) profileUpdates.email = newEmail.trim();

        await supabase.from('profiles').update(profileUpdates).eq('id', user_id);

        return new Response(JSON.stringify([{ success: true, message: "تم تحديث ملف المستخدم بنجاح" }]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: unknown) {
    console.error("Admin user management error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
