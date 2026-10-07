import pg from 'pg';
import { applyMigrations } from './migrations.js';
import { hashPassword } from './password.js';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  if (process.argv[2] === 'migrate') {
    await applyMigrations(client);
  } else if (process.argv[2] === 'seed') {
    const password = process.env.DEMO_CUSTOMER_PASSWORD;
    if (!password || password.length < 12 || password.length > 128)
      throw new Error(
        'Set DEMO_CUSTOMER_PASSWORD in .env to 12-128 characters before seeding.',
      );
    await client.query(`INSERT INTO users(id,email,role) VALUES
      ('00000000-0000-4000-8000-000000000001','customer-a@example.test','customer'),
      ('00000000-0000-4000-8000-000000000002','customer-b@example.test','customer'),
      ('00000000-0000-4000-8000-000000000003','staff@example.test','staff') ON CONFLICT DO NOTHING`);
    for (const id of [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ]) {
      const hash = await hashPassword(password);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        hash,
        id,
      ]);
      // Explicitly reseeding development credentials revokes prior sessions.
      await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    }
    await client.query(`INSERT INTO appointment_slots(id,starts_at,ends_at)
      SELECT ('10000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
        date_trunc('day',now() AT TIME ZONE 'Australia/Brisbane') AT TIME ZONE 'Australia/Brisbane' + interval '2 days' + n * interval '1 hour',
        date_trunc('day',now() AT TIME ZONE 'Australia/Brisbane') AT TIME ZONE 'Australia/Brisbane' + interval '2 days' + n * interval '1 hour' + interval '30 minutes'
      FROM generate_series(9,11) n ON CONFLICT DO NOTHING`);
  } else if (process.argv[2] === 'seed-more') {
    // Append a new demo day instead of resetting bookings or reusing occupied slots.
    // Serialise this development command so simultaneous runs choose separate days.
    await client.query('LOCK TABLE appointment_slots IN EXCLUSIVE MODE');
    const result = await client.query(`
      WITH next_day AS (
        SELECT GREATEST(
          (now() AT TIME ZONE 'Australia/Brisbane')::date + 2,
          MAX((starts_at AT TIME ZONE 'Australia/Brisbane')::date) + 1
        ) AS day FROM appointment_slots
      )
      INSERT INTO appointment_slots(id, starts_at, ends_at)
      SELECT md5('demo-slot:' || day::text || ':' || hour::text)::uuid,
        (day + make_time(hour, 0, 0)) AT TIME ZONE 'Australia/Brisbane',
        (day + make_time(hour, 30, 0)) AT TIME ZONE 'Australia/Brisbane'
      FROM next_day CROSS JOIN generate_series(9, 11) AS hour
      RETURNING id, starts_at AS "startsAt"
    `);
    console.log('Added demo appointments:', result.rows);
  } else throw new Error('Use migrate, seed or seed-more.');
  await client.query('COMMIT');
  console.log('Database command completed.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
