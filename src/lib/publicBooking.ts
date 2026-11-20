import { createClient } from '@supabase/supabase-js';

const publicSite = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { accessToken: async () => null },
);

export const publicSiteSlugPattern = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export interface PublicBookingRequest {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  destination: string;
  departureDate: string | null;
  returnDate: string | null;
  adults: number;
  budget: string;
  specialRequests: string;
}

export class PublicBookingError extends Error {}

export async function loadPublicBookingSite(slug: string) {
  const { data, error } = await publicSite.rpc('get_public_booking_site', { _slug: slug });
  if (error) throw new Error('Unable to load booking site');
  if (!data || typeof data.name !== 'string' || !data.name.trim()) return null;
  return { name: data.name };
}

export async function submitPublicBookingRequest(slug: string, requestKey: string, request: PublicBookingRequest) {
  const { data, error } = await publicSite.rpc('submit_public_booking_request', {
    _slug: slug,
    _request_key: requestKey,
    _request: request,
  });
  if (error?.code === 'PT429') throw new PublicBookingError('الطلبات وصلت للحد المؤقت. حاول مرة أخرى بعد شوية.');
  if (error?.code === 'PT404') throw new PublicBookingError('استقبال الطلبات غير متاح حاليًا عند الشركة دي.');
  if (error?.code === '22023' || error?.code === '22007' || error?.code === '22008') {
    throw new PublicBookingError('راجع بيانات الطلب ورقم الهاتف والتواريخ.');
  }
  if (error || typeof data?.reference !== 'string' || !data.reference.trim()) throw new Error('Unable to submit booking request');
  return { reference: data.reference };
}

export const publicPageSlugPattern = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;

interface PublicCmsPage {
  company: string;
  title: string;
  description: string | null;
  sections: { title: string | null; text: string }[];
  acceptsBooking: boolean;
}

export async function loadPublicCmsPage(companySlug: string, pageSlug: string): Promise<PublicCmsPage | null> {
  const { data, error } = await publicSite.rpc('get_public_cms_page', { _company_slug: companySlug, _page_slug: pageSlug });
  if (error) throw new Error('Unable to load public page');
  return data;
}
