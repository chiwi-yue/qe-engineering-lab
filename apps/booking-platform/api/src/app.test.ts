import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { Pool } from 'pg';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createApp } from './app.js';
const origin = 'http://127.0.0.1:5173';
const customerId = '00000000-0000-4000-8000-000000000001';
const slotId = '10000000-0000-4000-8000-000000000009';
const query = vi.fn();
let server: Server;
let base: string;
beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server = createApp({ query } as unknown as Pool).listen(
      0,
      '127.0.0.1',
      (error?: Error) => (error ? reject(error) : resolve()),
    );
    server.on('error', reject);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
});
beforeEach(() => {
  query.mockReset();
});
function request(body: unknown, cookie?: string, requestOrigin = origin) {
  return fetch(base + '/api/bookings', {
    method: 'POST',
    headers: {
      Origin: requestOrigin,
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}
describe('authenticated booking HTTP boundary (database double)', () => {
  it('rejects unauthenticated bookings before any database write', async () => {
    const response = await request({ slotId });
    expect(response.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects a cross-origin POST before accessing the database', async () => {
    const response = await request(
      { slotId },
      undefined,
      'https://other.example',
    );
    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects customerId spoofing after resolving the session', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: customerId,
          email: 'customer-a@example.test',
          role: 'customer',
          expiresAt: new Date(Date.now() + 60000),
        },
      ],
    });
    const response = await request(
      { slotId, customerId: '00000000-0000-4000-8000-000000000002' },
      `qe_session=${'a'.repeat(64)}`,
    );
    expect(response.status).toBe(400);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('uses the session principal when inserting a booking', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: customerId,
          email: 'customer-a@example.test',
          role: 'customer',
          expiresAt: new Date(Date.now() + 60000),
        },
      ],
    });
    query.mockResolvedValueOnce({
      rows: [
        {
          id: '30000000-0000-4000-8000-000000000001',
          slotId,
          customerId,
          status: 'confirmed',
          createdAt: new Date('2026-10-06T00:00:00Z'),
        },
      ],
    });
    const response = await request({ slotId }, `qe_session=${'b'.repeat(64)}`);
    expect(response.status).toBe(201);
    expect((await response.json()).booking.customerId).toBe(customerId);
    expect(query.mock.calls[1][1]).toEqual([
      expect.any(String),
      slotId,
      customerId,
    ]);
  });
});
