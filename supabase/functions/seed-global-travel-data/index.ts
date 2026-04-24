// Seed global airports and airlines from open data sources
// Sources: OurAirports (airports) + OpenFlights (airlines)
// Only platform admins can invoke this function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const AIRLINES_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat';

// Simple CSV parser that handles quoted fields with commas
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '\"') {
      if (inQuotes && line[i + 1] === '\"') {
        current += '\"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function importAirports(supabase: any) {
  console.log('Fetching airports CSV...');
  const res = await fetch(AIRPORTS_URL);
  if (!res.ok) throw new Error(`Airports fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);

  const idx = {
    type: header.indexOf('type'),
    name: header.indexOf('name'),
    lat: header.indexOf('latitude_deg'),
    lon: header.indexOf('longitude_deg'),
    country: header.indexOf('iso_country'),
    municipality: header.indexOf('municipality'),
    iata: header.indexOf('iata_code'),
    icao: header.indexOf('ident'),
  };

  const records: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const iata = cols[idx.iata]?.trim().replace(/\"/g, '');
    const type = cols[idx.type]?.trim().replace(/\"/g, '');
    if (!iata || iata.length !== 3) continue;
    if (type === 'closed_airport' || type === 'heliport' || type === 'small_airport') continue;
    const name = cols[idx.name]?.trim().replace(/\"/g, '');
    const city = cols[idx.municipality]?.trim().replace(/\"/g, '') || name;
    const country = cols[idx.country]?.trim().replace(/\"/g, '');
    const icao = cols[idx.icao]?.trim().replace(/\"/g, '');
    const lat = parseFloat(cols[idx.lat]) || null;
    const lon = parseFloat(cols[idx.lon]) || null;

    if (!name || !city) continue;

    records.push({
      name,
      city,
      country,
      iata_code: iata.toUpperCase(),
      icao_code: icao || null,
      latitude: lat,
      longitude: lon,
      is_active: true,
      is_global: true,
      organization_id: null,
    });
  }

  // Deduplicate by IATA (keep first)
  const seen = new Set<string>();
  const unique = records.filter((r) => {
    if (seen.has(r.iata_code)) return false;
    seen.add(r.iata_code);
    return true;
  });

  // Get existing global IATA codes to avoid conflicts (partial unique index)
  const { data: existing } = await supabase
    .from('airports')
    .select('iata_code')
    .eq('is_global', true);
  const existingSet = new Set((existing || []).map((r: any) => r.iata_code));
  const toInsert = unique.filter((r) => !existingSet.has(r.iata_code));

  console.log(`Inserting ${toInsert.length} new airports (${existingSet.size} already exist)...`);
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('airports').insert(batch);
    if (error) {
      console.error(`Batch ${i} error:`, error.message);
      continue;
    }
    inserted += batch.length;
  }
  return { total: unique.length, inserted };
}

async function importAirlines(supabase: any) {
  console.log('Fetching airlines DAT...');
  const res = await fetch(AIRLINES_URL);
  if (!res.ok) throw new Error(`Airlines fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n').filter((l) => l.trim());

  // Format: ID,Name,Alias,IATA,ICAO,Callsign,Country,Active
  const records: any[] = [];
  for (const line of lines) {
    const cols = parseCsvLine(line);
    if (cols.length < 8) continue;
    const name = cols[1]?.trim().replace(/\"/g, '');
    const iata = cols[3]?.trim().replace(/\"/g, '');
    const icao = cols[4]?.trim().replace(/\"/g, '');
    const country = cols[6]?.trim().replace(/\"/g, '');
    const active = cols[7]?.trim().replace(/\"/g, '');

    if (active !== 'Y') continue;
    if (!iata || iata.length !== 2 || iata === '\\N' || iata === '-') continue;
    if (!name || name === '\\N') continue;

    records.push({
      name,
      iata_code: iata.toUpperCase(),
      icao_code: icao && icao !== '\\N' ? icao : null,
      country: country && country !== '\\N' ? country : null,
      is_active: true,
      is_global: true,
      organization_id: null,
    });
  }

  // Deduplicate by IATA
  const seen = new Set<string>();
  const unique = records.filter((r) => {
    if (seen.has(r.iata_code)) return false;
    seen.add(r.iata_code);
    return true;
  });

  const { data: existing } = await supabase
    .from('airlines')
    .select('iata_code')
    .eq('is_global', true);
  const existingSet = new Set((existing || []).map((r: any) => r.iata_code));
  const toInsert = unique.filter((r) => !existingSet.has(r.iata_code));

  console.log(`Inserting ${toInsert.length} new airlines (${existingSet.size} already exist)...`);
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('airlines').insert(batch);
    if (error) {
      console.error(`Airlines batch ${i} error:`, error.message);
      continue;
    }
    inserted += batch.length;
  }
  return { total: unique.length, inserted };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is platform admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await userClient.rpc('is_platform_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: platform admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const target = body.target || 'all'; // 'airports' | 'airlines' | 'all'

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const result: any = {};

    if (target === 'airports' || target === 'all') {
      result.airports = await importAirports(admin);
    }
    if (target === 'airlines' || target === 'all') {
      result.airlines = await importAirlines(admin);
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('Seed error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
