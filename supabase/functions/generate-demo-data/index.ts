import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit, rateLimitResponse } from '../_shared/rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = claimsData.claims.sub as string

    // Rate limit: 3 requests per minute per user
    const rl = rateLimit(`demo-data:${userId}`, 3, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders)

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    const { organization_id } = await req.json()
    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify user belongs to org
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if demo data already exists
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('has_demo_data')
      .eq('id', organization_id)
      .single()

    if (org?.has_demo_data) {
      return new Response(JSON.stringify({ message: 'Demo data already exists' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- Insert demo data ---

    // 3 customers
    const { data: customers } = await supabaseAdmin.from('customers').insert([
      { name: 'أحمد محمد علي', phone: '01012345678', email: 'ahmed@demo.com', nationality: 'مصري', organization_id },
      { name: 'سارة خالد إبراهيم', phone: '01198765432', email: 'sara@demo.com', nationality: 'مصري', organization_id },
      { name: 'محمد عبدالله حسن', phone: '01055512345', email: 'mohammed@demo.com', nationality: 'سعودي', organization_id },
    ]).select('id, name')

    // 1 supplier
    const { data: supplier } = await supabaseAdmin.from('suppliers').insert({
      name: 'شركة النيل للسياحة - مورد تجريبي',
      phone: '0223456789',
      email: 'supplier@demo.com',
      type: 'hotel',
      is_active: true,
      organization_id,
    }).select('id').single()

    // 2 hotel bookings
    const today = new Date()
    const checkIn1 = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]
    const checkOut1 = new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0]
    const checkIn2 = new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0]
    const checkOut2 = new Date(today.getTime() + 18 * 86400000).toISOString().split('T')[0]

    const { data: bookings } = await supabaseAdmin.from('hotel_bookings').insert([
      {
        customer_name: customers?.[0]?.name || 'أحمد محمد علي',
        customer_id: customers?.[0]?.id || null,
        hotel_name: 'فندق شيراتون القاهرة',
        destination_city: 'القاهرة',
        check_in_date: checkIn1,
        check_out_date: checkOut1,
        number_of_nights: 3,
        number_of_adults: 2,
        cost_per_night: 1500,
        selling_price_per_night: 2000,
        total_cost_customer: 6000,
        total_profit: 1500,
        meal_plan: 'BB',
        room_type: 'Double',
        organization_id,
      },
      {
        customer_name: customers?.[1]?.name || 'سارة خالد إبراهيم',
        customer_id: customers?.[1]?.id || null,
        hotel_name: 'منتجع ريكسوس شرم الشيخ',
        destination_city: 'شرم الشيخ',
        check_in_date: checkIn2,
        check_out_date: checkOut2,
        number_of_nights: 4,
        number_of_adults: 2,
        number_of_children: 1,
        cost_per_night: 2500,
        selling_price_per_night: 3200,
        total_cost_customer: 12800,
        total_profit: 2800,
        meal_plan: 'AI',
        room_type: 'Family',
        organization_id,
      },
    ]).select('id')

    // 1 invoice linked to first booking
    const invoiceNumber = 'DEMO-INV-' + Date.now().toString().slice(-6)
    await supabaseAdmin.from('invoices').insert({
      invoice_number: invoiceNumber,
      customer_id: customers?.[0]?.id || null,
      customer_name: customers?.[0]?.name || 'أحمد محمد علي',
      booking_id: bookings?.[0]?.id || null,
      booking_type: 'hotel',
      subtotal: 6000,
      vat_rate: 14,
      vat_amount: 840,
      final_amount: 6840,
      status: 'issued',
      payment_status: 'partial',
      total_paid_amount: 3000,
      remaining_amount: 3840,
      currency: 'EGP',
      organization_id,
    })

    // Mark org as having demo data
    await supabaseAdmin
      .from('organizations')
      .update({ has_demo_data: true })
      .eq('id', organization_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم إنشاء البيانات التجريبية بنجاح',
        summary: {
          customers: customers?.length || 0,
          bookings: bookings?.length || 0,
          suppliers: supplier ? 1 : 0,
          invoices: 1,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Demo data error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
