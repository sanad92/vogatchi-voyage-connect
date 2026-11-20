import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { handleMetaLeadWebhook } from '../_shared/meta-lead-ads.ts';

Deno.serve(request => {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return handleMetaLeadWebhook(request, {
    secret: Deno.env.get('META_LEAD_ADS_APP_SECRET'),
    verifyToken: Deno.env.get('META_LEAD_ADS_VERIFY_TOKEN'),
    async resolve(event) {
      const { data, error } = await admin.rpc('meta_lead_ads_route_resolve', {
        _page_id: event.page, _form_id: event.form, _leadgen_id: event.leadgen,
      }).maybeSingle<{ revision: string; page_token: string }>();
      if (error) throw new Error('route_lookup_failed');
      return data;
    },
    async save(event, revision, details) {
      const { data, error } = await admin.rpc('meta_lead_ads_import', {
        _page_id: event.page, _form_id: event.form, _leadgen_id: event.leadgen, _revision: revision,
        _name: details.name, _email: details.email, _phone: details.phone, _campaign_id: details.campaign,
      });
      if (error || !['imported', 'unavailable', 'route_changed', 'already_processed', 'missing_contact'].includes(data)) {
        throw new Error('lead_import_failed');
      }
      return data;
    },
  });
});
