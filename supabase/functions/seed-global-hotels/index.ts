// Seed global hotels from a user-uploaded CSV in the `hotel-imports` storage bucket.
// Processes the file in chunks (offset/limit) so the frontend can call it in a loop with a progress bar.
// Only platform admins can invoke.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Robust CSV line parser (handles quoted fields & escaped quotes)
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else current += ch;
  }
  result.push(current);
  return result;
}

// Map a header name to its column index, tolerating common variants
function findCol(header: string[], candidates: string[]): number {
  const norm = header.map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
  for (const c of candidates) {
    const k = c.toLowerCase().replace(/[\s_-]+/g, '');
    const idx = norm.indexOf(k);
    if (idx !== -1) return idx;
  }
  return -1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify platform admin via the caller's JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from('platform_roles').select('id').eq('user_id', userData.user.id).maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ success: false, error: 'Platform admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const filePath: string = body.file_path ?? 'tbo-hotels.csv';
    const offset: number = Math.max(0, Number(body.offset) || 0);
    const limit: number = Math.max(100, Math.min(10000, Number(body.limit) || 5000));
    const reset: boolean = body.reset === true;

    // Optional reset: wipe all global hotels (admin only via service role)
    if (reset) {
      const { error: delErr } = await admin.from('hotels').delete().eq('is_global', true);
      if (delErr) throw new Error(`Reset failed: ${delErr.message}`);
      return new Response(JSON.stringify({ success: true, reset: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download the CSV from storage
    const { data: fileBlob, error: dlErr } = await admin.storage
      .from('hotel-imports').download(filePath);
    if (dlErr || !fileBlob) throw new Error(`Cannot download ${filePath}: ${dlErr?.message ?? 'unknown'}`);

    const text = await fileBlob.text();
    // Split lines (handle CRLF + skip empty)
    const allLines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (allLines.length < 2) throw new Error('Empty CSV');

    const header = parseCsvLine(allLines[0]);
    const dataLines = allLines.slice(1);
    const totalRows = dataLines.length;

    // Detect TBO-style columns (with fallbacks for common variants)
    const cName = findCol(header, ['HotelName', 'Hotel Name', 'Name', 'name']);
    const cCode = findCol(header, ['HotelCode', 'Hotel Code', 'HotelID', 'ID']);
    const cCity = findCol(header, ['CityName', 'City', 'cityName']);
    const cCountry = findCol(header, ['CountryName', 'Country']);
    const cCC = findCol(header, ['CountryCode', 'Country Code', 'CC']);
    const cStars = findCol(header, ['HotelRating', 'Rating', 'StarRating', 'Stars']);
    const cAddr = findCol(header, ['Address', 'HotelAddress']);
    const cPhone = findCol(header, ['HotelFacilities', 'PhoneNumber', 'Phone']);
    const cLat = findCol(header, ['Latitude', 'lat', 'Map']);
    const cLon = findCol(header, ['Longitude', 'lon', 'lng']);
    const cDesc = findCol(header, ['Description', 'HotelDescription', 'Attractions']);
    const cMap = findCol(header, ['Map']); // sometimes "lat|lon"

    if (cName === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: `لم يتم العثور على عمود اسم الفندق في ملف CSV. الأعمدة الموجودة: ${header.join(', ')}`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Slice the chunk
    const slice = dataLines.slice(offset, offset + limit);
    const records: any[] = [];
    const seenCodes = new Set<string>();

    for (const line of slice) {
      const cols = parseCsvLine(line);
      const name = (cols[cName] || '').trim();
      if (!name) continue;

      // parse stars: handle "OneStar"/"TwoStar"/.../number/"5"
      let stars: number | null = null;
      if (cStars !== -1) {
        const raw = (cols[cStars] || '').trim();
        const map: Record<string, number> = {
          onestar: 1, twostar: 2, threestar: 3, fourstar: 4, fivestar: 5, all: 0,
        };
        const k = raw.toLowerCase().replace(/[\s_-]+/g, '');
        if (map[k] !== undefined) stars = map[k] || null;
        else {
          const n = parseInt(raw, 10);
          if (!isNaN(n) && n >= 1 && n <= 5) stars = n;
        }
      }

      // lat/lon — sometimes combined in "Map" as "lat|lon"
      let lat: number | null = null, lon: number | null = null;
      if (cLat !== -1) { const v = parseFloat(cols[cLat]); if (!isNaN(v)) lat = v; }
      if (cLon !== -1) { const v = parseFloat(cols[cLon]); if (!isNaN(v)) lon = v; }
      if ((lat === null || lon === null) && cMap !== -1 && cLat === -1) {
        const parts = (cols[cMap] || '').split('|');
        if (parts.length === 2) {
          const a = parseFloat(parts[0]); const b = parseFloat(parts[1]);
          if (!isNaN(a) && !isNaN(b)) { lat = a; lon = b; }
        }
      }

      const code = cCode !== -1 ? (cols[cCode] || '').trim() : '';
      // De-dup within chunk to avoid ON CONFLICT errors on the unique index
      if (code) {
        if (seenCodes.has(code)) continue;
        seenCodes.add(code);
      }

      records.push({
        name: name.slice(0, 255),
        is_global: true,
        organization_id: null,
        is_active: true,
        tbo_hotel_code: code || null,
        city: cCity !== -1 ? (cols[cCity] || '').trim().slice(0, 120) || null : null,
        country: cCountry !== -1 ? (cols[cCountry] || '').trim().slice(0, 120) || null : null,
        country_code: cCC !== -1 ? (cols[cCC] || '').trim().slice(0, 5).toUpperCase() || null : null,
        star_rating: stars,
        latitude: lat,
        longitude: lon,
        address: cAddr !== -1 ? (cols[cAddr] || '').trim().slice(0, 500) || null : null,
        phone: cPhone !== -1 ? (cols[cPhone] || '').trim().slice(0, 50) || null : null,
        description: cDesc !== -1 ? (cols[cDesc] || '').trim().slice(0, 2000) || null : null,
      });
    }

    let inserted = 0;
    if (records.length > 0) {
      // Skip rows whose tbo_hotel_code already exists in DB to avoid conflict on partial unique index
      const codes = records.map((r) => r.tbo_hotel_code).filter(Boolean) as string[];
      let existing = new Set<string>();
      if (codes.length > 0) {
        const { data: ex } = await admin
          .from('hotels').select('tbo_hotel_code')
          .eq('is_global', true).in('tbo_hotel_code', codes);
        existing = new Set((ex ?? []).map((r: any) => r.tbo_hotel_code));
      }
      const toInsert = records.filter((r) => !r.tbo_hotel_code || !existing.has(r.tbo_hotel_code));

      // Insert in sub-batches of 500
      for (let i = 0; i < toInsert.length; i += 500) {
        const batch = toInsert.slice(i, i + 500);
        const { error } = await admin.from('hotels').insert(batch);
        if (error) {
          console.error('Insert batch error:', error);
          throw new Error(`Insert failed at sub-batch ${i}: ${error.message}`);
        }
        inserted += batch.length;
      }
    }

    const nextOffset = offset + slice.length;
    const done = nextOffset >= totalRows;

    return new Response(JSON.stringify({
      success: true,
      total_rows: totalRows,
      processed: slice.length,
      inserted,
      offset,
      next_offset: nextOffset,
      done,
      progress_percent: totalRows > 0 ? Math.round((nextOffset / totalRows) * 100) : 100,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('seed-global-hotels error:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
