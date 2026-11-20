import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const tenant = '10000000-0000-4000-8000-000000000001';
const otherTenant = '10000000-0000-4000-8000-000000000002';
const customer = '20000000-0000-4000-8000-000000000001';
const otherCustomer = '20000000-0000-4000-8000-000000000002';
const parent = '30000000-0000-4000-8000-000000000001';
const services = ['hotel_bookings', 'flight_bookings', 'transport_bookings', 'car_rentals'];
const hasMessage = (snippet) => (error) => error.message.includes(snippet);

try {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA pilgrimage_inventory_private;
    CREATE TABLE public.bookings (id uuid PRIMARY KEY, organization_id uuid, customer_id uuid, currency text, locked boolean DEFAULT false, sync_count int DEFAULT 0);
    ${services.map(service => `CREATE TABLE public.${service} (booking_id uuid, organization_id uuid, customer_id uuid, currency text);`).join('\n')}
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
    INSERT INTO public.bookings (id,organization_id,customer_id,currency) VALUES ('${parent}','${tenant}','${customer}','SAR');
    CREATE FUNCTION public.sync_booking_financials(p_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql AS $$
    BEGIN
      UPDATE public.bookings SET sync_count = sync_count + 1 WHERE id = p_booking_id;
      IF (SELECT locked FROM public.bookings WHERE id = p_booking_id) THEN
        RETURN jsonb_build_object('reason','locked');
      END IF;
      RETURN jsonb_build_object('invoice_updated',true);
    END;
    $$;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261120140454_validate_linked_booking_service_fields.sql', import.meta.url), 'utf8'));
  await db.exec('SET ROLE authenticated');
  for (const service of services) {
    const insert = `INSERT INTO public.${service} (booking_id,organization_id,customer_id,currency) VALUES ($1,$2,$3,$4)`;
    await assert.rejects(db.query(insert, [parent, otherTenant, customer, 'SAR']), hasMessage('الحالية'));
    await assert.rejects(db.query(insert, [parent, tenant, otherCustomer, 'SAR']), hasMessage('نفس عميل'));
    await assert.rejects(db.query(insert, [parent, tenant, customer, 'EGP']), hasMessage('عملة ملف الحجز'));
    await db.query(insert, [parent, tenant, customer, 'SAR']);
    await assert.rejects(db.exec(`UPDATE public.${service} SET currency = 'EGP'`), hasMessage('عملة ملف الحجز'));
  }
  assert.equal((await db.query('SELECT sync_count FROM public.bookings')).rows[0].sync_count, 4);
  await db.exec('UPDATE public.bookings SET locked = true');
  await assert.rejects(db.query('INSERT INTO public.car_rentals VALUES ($1,$2,$3,$4)', [parent, tenant, customer, 'SAR']), hasMessage('الفاتورة مقفلة'));
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.car_rentals')).rows[0].count, 1);
  assert.equal((await db.query('SELECT sync_count FROM public.bookings')).rows[0].sync_count, 4);
  console.log('Linked service parent fields and transactional finance rollback verified for the four service tables.');
} finally {
  await db.close();
}
