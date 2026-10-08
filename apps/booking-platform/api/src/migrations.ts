import type { PoolClient } from 'pg';
import { readFile } from 'node:fs/promises';

// Caller owns the transaction. Development and test setup use the same migrations.
export async function applyMigrations(client: PoolClient): Promise<void> {
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  await client.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE');
  for (const [version, file] of [
    ['001', '001_initial.sql'],
    ['002', '002_sessions.sql'],
  ]) {
    const existing = await client.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [version],
    );
    if (!existing.rowCount) {
      await client.query(
        await readFile(new URL(`../db/${file}`, import.meta.url), 'utf8'),
      );
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [
        version,
      ]);
    }
  }
}
