import pg from 'pg';
import { testDatabaseUrl } from './test-environment.mjs';
import { applyMigrations } from '../apps/booking-platform/api/dist/migrations.js';

const pool = new pg.Pool({ connectionString: testDatabaseUrl() });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await applyMigrations(client);
  await client.query('COMMIT');
  console.log('Test database migrations applied.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
