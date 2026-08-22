import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['admin', 'manager', 'sales_agent', 'accountant', 'viewer', 'super_admin'] as const;
const VALID_ORG_ROLES = ['admin', 'manager', 'agent', 'viewer'] as const;

async function isPlatformAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc('is_platform_admin', { _user_id: userId });
  return Boolean(data);
}

async function getCallerOrgIds(supabase: any, userId: string, requireAdmin = false): Promise<string[]> {
  const query = supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('is_active', true);
  const { data } = await query;
  if (!data) return [];
  const adminRoles = new Set(['owner', 'admin', 'super_admin']);
  return data
    .filter((m: any) => !requireAdmin || adminRoles.has(m.role))
    .map((m: any) => m.organization_id as string);
}

async function checkSuperAdmin(supabase: any, userId: string): Promise<boolean> {
  if (await isPlatformAdmin(supabase, userId)) return true;
  const adminOrgs = await getCallerOrgIds(supabase, userId, true);
  return adminOrgs.length > 0;
}

/**
 * Verifies the caller has admin rights over the target user.
 * Platform admins always pass. Org admins must share at least one org with the target user.
 */
async function callerCanManageUser(supabase: any, callerId: string, targetUserId: string): Promise<boolean> {
  if (await isPlatformAdmin(supabase, callerId)) return true;
  const callerAdminOrgs = await getCallerOrgIds(supabase, callerId, true);
  if (callerAdminOrgs.length === 0) return false;
  const { data: targetMemberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', targetUserId)
    .eq('is_active', true);
  if (!targetMemberships || targetMemberships.length === 0) {
    // Target has no org → only platform admins may touch it
    return false;
  }
  const targetOrgs = new Set(targetMemberships.map((m: any) => m.organization_id));
  return callerAdminOrgs.some((o) => targetOrgs.has(o));
}

/**
 * Verifies the caller is an admin in the specified target organization.
 */
async function callerCanManageOrg(supabase: any, callerId: string, targetOrgId: string): Promise<boolean> {
  if (await isPlatformAdmin(supabase, callerId)) return true;
  const callerAdminOrgs = await getCallerOrgIds(supabase, callerId, true);
  return callerAdminOrgs.includes(targetOrgId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    // Team identities are never created or recycled by an administrator.
    // Members join through the invitation flow and own their credentials.
    if (action === 'create_team_member' || action === 'reassign_team_seat') {
      return new Response(JSON.stringify([{
        success: false,
        code: 'INVITATION_REQUIRED',
        message: 'إضافة أعضاء الفريق متاحة بالدعوة فقط',
      }]), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "create_user": {
        // Platform-level user creation is restricted to platform admins to prevent
        // org admins from creating un-scoped users with elevated profile roles.
        if (!(await isPlatformAdmin(supabase, user.id))) {
          return new Response(JSON.stringify({ error: "Forbidden: platform admin required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
            })
            .eq('id', newUser.user.id);
        }

        return new Response(JSON.stringify([{ success: true, user_id: newUser.user.id, message: "تم إنشاء المستخدم بنجاح" }]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id, new_password } = body;

        if (!(await isPlatformAdmin(supabase, user.id))) {
          return new Response(JSON.stringify([{ success: false, message: "استخدم مسار نسيت كلمة المرور؛ لا يمكن لمدير المؤسسة تعيين كلمة مرور مستخدم آخر" }]), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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

        // Cross-org guard: caller must be platform admin or share an org (as admin) with the target user.
        if (!(await callerCanManageUser(supabase, user.id, user_id))) {
          return new Response(JSON.stringify([{ success: false, message: "غير مسموح: لا تملك صلاحيات إدارية على هذا المستخدم" }]), {
            status: 403,
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

        if (!(await isPlatformAdmin(supabase, user.id))) {
          return new Response(JSON.stringify([{ success: false, message: "تعديل هوية المستخدم متاح لإدارة المنصة فقط" }]), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!user_id || typeof user_id !== 'string') {
          return new Response(JSON.stringify([{ success: false, message: "معرف المستخدم مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Cross-org guard
        if (!(await callerCanManageUser(supabase, user.id, user_id))) {
          return new Response(JSON.stringify([{ success: false, message: "غير مسموح: لا تملك صلاحيات إدارية على هذا المستخدم" }]), {
            status: 403,
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

      case "create_team_member": {
        const { email, password, full_name, phone, organization_id, org_role, employee_data } = body;

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
        if (!full_name || typeof full_name !== 'string' || !full_name.trim() || full_name.length > 200) {
          return new Response(JSON.stringify([{ success: false, message: "الاسم الكامل مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!organization_id || typeof organization_id !== 'string') {
          return new Response(JSON.stringify([{ success: false, message: "معرف المؤسسة مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!org_role || !VALID_ORG_ROLES.includes(org_role)) {
          return new Response(JSON.stringify([{ success: false, message: "الدور غير صالح" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Cross-org guard: caller must be platform admin or admin/owner of the target organization.
        if (!(await callerCanManageOrg(supabase, user.id, organization_id))) {
          return new Response(JSON.stringify([{ success: false, message: "غير مسموح: لا تملك صلاحيات إدارية على هذه المؤسسة" }]), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create auth user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name.trim(),
            phone: phone?.trim() || null,
          },
        });

        if (createError || !newUser?.user) {
          const msg = createError?.message || "فشل إنشاء المستخدم";
          const emailTaken = /already been registered|already registered|already exists/i.test(msg);
          return new Response(JSON.stringify([{
            success: false,
            code: emailTaken ? 'EMAIL_EXISTS' : undefined,
            message: emailTaken
              ? "هذا البريد الإلكتروني مستخدم بالفعل في حساب موجود"
              : msg,
          }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const newUserId = newUser.user.id;

        // Update profile
        await supabase.from('profiles').update({
          full_name: full_name.trim(),
          phone: phone?.trim() || null,
          email: email.trim(),
        }).eq('id', newUserId);

        // Add to organization_members
        const { error: memberError } = await supabase.from('organization_members').insert({
          organization_id,
          user_id: newUserId,
          role: org_role,
          is_active: true,
        });

        if (memberError) {
          // Rollback: delete the auth user
          await supabase.auth.admin.deleteUser(newUserId);
          return new Response(JSON.stringify([{ success: false, message: `فشل إضافة العضو للمؤسسة: ${memberError.message}` }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Optionally create employee record
        let employeeId: string | null = null;
        if (employee_data && typeof employee_data === 'object') {
          const empCode = employee_data.employee_code?.trim() || `EMP-${Date.now().toString().slice(-6)}`;
          const { data: emp, error: empError } = await supabase.from('employees').insert({
            organization_id,
            employee_code: empCode,
            full_name: full_name.trim(),
            email: email.trim(),
            phone: phone?.trim() || null,
            position: employee_data.position?.trim() || null,
            department: employee_data.department?.trim() || null,
            hire_date: employee_data.hire_date || null,
            base_salary: Number(employee_data.base_salary) || 0,
            is_active: true,
          }).select('id').single();

          if (!empError && emp) {
            employeeId = emp.id;
            await supabase.from('profiles').update({ linked_employee_id: emp.id }).eq('id', newUserId);
          }
        }

        return new Response(JSON.stringify([{
          success: true,
          user_id: newUserId,
          employee_id: employeeId,
          message: "تم إضافة العضو بنجاح",
        }]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Seat reuse: check whether an email already has an account ──────────
      case "check_team_email": {
        const { email, organization_id } = body;

        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
          return new Response(JSON.stringify([{ success: false, message: "بريد إلكتروني غير صالح" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!organization_id || typeof organization_id !== 'string') {
          return new Response(JSON.stringify([{ success: false, message: "معرف المؤسسة مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!(await callerCanManageOrg(supabase, user.id, organization_id))) {
          return new Response(JSON.stringify([{ success: false, message: "غير مسموح" }]), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const cleanEmail = email.trim().toLowerCase();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, linked_employee_id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!profile) {
          return new Response(JSON.stringify([{ success: true, exists: false }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: membership } = await supabase
          .from('organization_members')
          .select('id, role, is_active')
          .eq('organization_id', organization_id)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (!membership) {
          // Account exists but belongs to another organization — do not leak details.
          return new Response(JSON.stringify([{ success: true, exists: true, in_org: false }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify([{
          success: true,
          exists: true,
          in_org: true,
          user_id: profile.id,
          full_name: profile.full_name,
          role: membership.role,
          membership_active: membership.is_active,
        }]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Seat reuse: reassign an existing account to a new employee ─────────
      case "reassign_team_seat": {
        const { organization_id, user_id, full_name, phone, password, org_role, employee_data } = body;

        if (!organization_id || typeof organization_id !== 'string' || !user_id || typeof user_id !== 'string') {
          return new Response(JSON.stringify([{ success: false, message: "بيانات غير مكتملة" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!full_name || typeof full_name !== 'string' || !full_name.trim() || full_name.length > 200) {
          return new Response(JSON.stringify([{ success: false, message: "الاسم الكامل مطلوب" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!org_role || !VALID_ORG_ROLES.includes(org_role) || org_role === 'owner') {
          return new Response(JSON.stringify([{ success: false, message: "الدور غير صالح" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (password !== undefined && password !== null && password !== '' &&
            (typeof password !== 'string' || password.length < 8 || password.length > 128)) {
          return new Response(JSON.stringify([{ success: false, message: "كلمة المرور يجب أن تكون بين 8 و 128 حرف" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!(await callerCanManageOrg(supabase, user.id, organization_id))) {
          return new Response(JSON.stringify([{ success: false, message: "غير مسموح: لا تملك صلاحيات إدارية على هذه المؤسسة" }]), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // The target account must already belong to this organization.
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id, role, is_active')
          .eq('organization_id', organization_id)
          .eq('user_id', user_id)
          .maybeSingle();

        if (!membership) {
          return new Response(JSON.stringify([{ success: false, message: "هذا الحساب لا ينتمي لمؤسستك" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (membership.role === 'owner') {
          return new Response(JSON.stringify([{ success: false, message: "لا يمكن إعادة تعيين حساب المالك" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: oldProfile } = await supabase
          .from('profiles')
          .select('id, email, full_name, linked_employee_id')
          .eq('id', user_id)
          .maybeSingle();

        // Update auth account (name/phone metadata + optional new password)
        const authUpdates: Record<string, any> = {
          user_metadata: { full_name: full_name.trim(), phone: phone?.trim() || null },
        };
        if (password) authUpdates.password = password;
        const { error: authErr } = await supabase.auth.admin.updateUserById(user_id, authUpdates);
        if (authErr) {
          return new Response(JSON.stringify([{ success: false, message: authErr.message }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Retire the previous HR record (kept for history, just deactivated)
        if (oldProfile?.linked_employee_id) {
          await supabase
            .from('employees')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', oldProfile.linked_employee_id)
            .eq('organization_id', organization_id);
        }

        // Create the new HR record for the incoming employee
        let employeeId: string | null = null;
        if (employee_data && typeof employee_data === 'object') {
          const empCode = employee_data.employee_code?.trim() || `EMP-${Date.now().toString().slice(-6)}`;
          const { data: emp } = await supabase.from('employees').insert({
            organization_id,
            employee_code: empCode,
            full_name: full_name.trim(),
            email: oldProfile?.email || null,
            phone: phone?.trim() || null,
            position: employee_data.position?.trim() || null,
            department: employee_data.department?.trim() || null,
            hire_date: employee_data.hire_date || new Date().toISOString().split('T')[0],
            base_salary: Number(employee_data.base_salary) || 0,
            is_active: true,
          }).select('id').single();
          employeeId = emp?.id ?? null;
        }

        await supabase.from('profiles').update({
          full_name: full_name.trim(),
          phone: phone?.trim() || null,
          linked_employee_id: employeeId,
          updated_at: new Date().toISOString(),
        }).eq('id', user_id);

        await supabase.from('organization_members').update({
          role: org_role,
          is_active: true,
        }).eq('id', membership.id);

        await supabase.from('admin_audit_log').insert({
          organization_id,
          user_id: user.id,
          user_email: user.email ?? null,
          action: 'reassign_team_seat',
          target_table: 'organization_members',
          target_id: membership.id,
          entity_name: full_name.trim(),
          old_values: {
            full_name: oldProfile?.full_name ?? null,
            linked_employee_id: oldProfile?.linked_employee_id ?? null,
            role: membership.role,
            is_active: membership.is_active,
          },
          new_values: { full_name: full_name.trim(), linked_employee_id: employeeId, role: org_role, is_active: true },
        });

        return new Response(JSON.stringify([{
          success: true,
          user_id,
          employee_id: employeeId,
          message: "تمت إعادة تعيين الحساب للموظف الجديد بنجاح",
        }]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Offboarding: free the seat and close the HR record ─────────────────
      case "offboard_member": {
        const { organization_id, user_id, termination_date, note } = body;

        if (!organization_id || typeof organization_id !== 'string' || !user_id || typeof user_id !== 'string') {
          return new Response(JSON.stringify([{ success: false, message: "بيانات غير مكتملة" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!(await callerCanManageOrg(supabase, user.id, organization_id))) {
          return new Response(JSON.stringify([{ success: false, message: "غير مسموح" }]), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: membership } = await supabase
          .from('organization_members')
          .select('id, role, is_active')
          .eq('organization_id', organization_id)
          .eq('user_id', user_id)
          .maybeSingle();

        if (!membership) {
          return new Response(JSON.stringify([{ success: false, message: "العضو غير موجود في هذه المؤسسة" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (membership.role === 'owner') {
          return new Response(JSON.stringify([{ success: false, message: "لا يمكن إنهاء خدمة مالك المؤسسة" }]), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from('organization_members')
          .update({ is_active: false })
          .eq('id', membership.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, linked_employee_id')
          .eq('id', user_id)
          .maybeSingle();

        if (profile?.linked_employee_id) {
          await supabase.from('employees')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', profile.linked_employee_id)
            .eq('organization_id', organization_id);
        }

        await supabase.from('admin_audit_log').insert({
          organization_id,
          user_id: user.id,
          user_email: user.email ?? null,
          action: 'offboard_member',
          target_table: 'organization_members',
          target_id: membership.id,
          entity_name: profile?.full_name ?? profile?.email ?? null,
          details: {
            termination_date: termination_date || new Date().toISOString().split('T')[0],
            note: typeof note === 'string' ? note.slice(0, 500) : null,
            employee_id: profile?.linked_employee_id ?? null,
          },
        });

        return new Response(JSON.stringify([{
          success: true,
          message: "تم إنهاء خدمة الموظف وتحرير المقعد",
          email: profile?.email ?? null,
        }]), {
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
