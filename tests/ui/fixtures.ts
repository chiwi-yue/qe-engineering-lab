import { randomUUID, randomBytes } from 'node:crypto';
import pg from 'pg';
import {
  test as base,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { hashPassword } from '../../apps/booking-platform/api/src/password.js';

export type Customer = { id: string; email: string; password: string };
type Data = { a: Customer; b: Customer; slotId: string; db: pg.Pool };
export const origin = 'http://127.0.0.1:5174';
export const test = base.extend<{ data: Data }>({
  // Playwright requires a destructured fixture argument, even with no dependencies.
  // eslint-disable-next-line no-empty-pattern
  data: async ({}, use, testInfo) => {
    const connectionString = process.env.TEST_DATABASE_URL;
    if (
      !connectionString ||
      !decodeURIComponent(new URL(connectionString).pathname).endsWith('_test')
    )
      throw new Error(
        'A dedicated TEST_DATABASE_URL ending in _test is required.',
      );
    const db = new pg.Pool({ connectionString });
    const customer = (): Customer => {
      const id = randomUUID();
      return {
        id,
        email: `${id}@example.test`,
        password: randomBytes(18).toString('hex'),
      };
    };
    const a = customer(),
      b = customer(),
      slotId = randomUUID();
    try {
      for (const user of [a, b])
        await db.query(
          "INSERT INTO users(id,email,role,password_hash) VALUES ($1,$2,'customer',$3)",
          [user.id, user.email, await hashPassword(user.password)],
        );
      await db.query(
        `INSERT INTO appointment_slots(id,starts_at,ends_at)
        VALUES ($1, now() + interval '7 days', now() + interval '7 days 30 minutes')`,
        [slotId],
      );
      await use({ a, b, slotId, db });
    } finally {
      try {
        if (testInfo.status !== testInfo.expectedStatus) {
          const result = await db.query(
            'SELECT id,slot_id,customer_id,status FROM bookings WHERE slot_id = $1 OR customer_id = ANY($2::uuid[])',
            [slotId, [a.id, b.id]],
          );
          await testInfo.attach('fixture-sql-state', {
            body: JSON.stringify(
              { slotId, customerIds: [a.id, b.id], bookings: result.rows },
              null,
              2,
            ),
            contentType: 'application/json',
          });
        }
      } finally {
        await cleanFixture(db, slotId, [a.id, b.id]);
      }
    }
  },
});
export { expect };
export async function login(page: Page, customer: Customer) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(customer.email);
  await page.getByLabel('Password', { exact: true }).fill(customer.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(
    page.getByText(`Logged in as ${customer.email}`, { exact: true }),
  ).toBeVisible();
}
export async function apiLogin(request: APIRequestContext, customer: Customer) {
  const response = await request.post('/api/auth/login', {
    headers: { Origin: origin },
    data: { email: customer.email, password: customer.password },
  });
  expect(response.status()).toBe(200);
}
export async function apiBook(
  request: APIRequestContext,
  slotId: string,
): Promise<string> {
  const response = await request.post('/api/bookings', {
    headers: { Origin: origin },
    data: { slotId },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).booking.id;
}

async function cleanFixture(
  db: pg.Pool,
  slotId: string,
  customerIds: string[],
) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM bookings WHERE slot_id = $1 OR customer_id = ANY($2::uuid[])',
      [slotId, customerIds],
    );
    await client.query('DELETE FROM appointment_slots WHERE id = $1', [slotId]);
    // Sessions cascade from these two users only. No shared-table truncation.
    await client.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
      customerIds,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}
