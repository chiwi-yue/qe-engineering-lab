import { describe, expect, it, vi } from 'vitest';
import {
  createBooking,
  manageBooking,
  type BookingRepository,
} from './booking.js';
import type { Principal } from './auth.js';
const customer: Principal = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'customer-a@example.test',
  role: 'customer',
};
const input = { slotId: '10000000-0000-4000-8000-000000000009' };
describe('booking boundary', () => {
  it('rejects malformed identifiers before accessing persistence', async () => {
    const create = vi.fn();
    await expect(
      createBooking({ slotId: 'bad' }, customer, { create }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' });
    expect(create).not.toHaveBeenCalled();
  });
  it('persists the authenticated customer as booking owner', async () => {
    const create = vi.fn(async (data, id) => ({
      ...data,
      id,
      status: 'confirmed' as const,
      createdAt: '2026-10-06T00:00:00Z',
    }));
    const result = await createBooking(input, customer, { create });
    expect(result).toMatchObject({
      ...input,
      customerId: customer.id,
      status: 'confirmed',
    });
    expect(create).toHaveBeenCalledWith(
      { ...input, customerId: customer.id },
      result.id,
    );
  });
  it('rejects caller-supplied identity rather than allowing impersonation', async () => {
    const create = vi.fn();
    await expect(
      createBooking(
        { ...input, customerId: '00000000-0000-4000-8000-000000000002' },
        customer,
        { create },
      ),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' });
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects staff booking attempts before accessing persistence', async () => {
    const create = vi.fn();
    await expect(
      createBooking(input, { ...customer, role: 'staff' }, { create }),
    ).rejects.toMatchObject({ status: 403, code: 'CUSTOMER_REQUIRED' });
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects an absent or past slot', async () => {
    await expect(
      createBooking(input, customer, { create: async () => null }),
    ).rejects.toMatchObject({ status: 422, code: 'INELIGIBLE_BOOKING' });
  });
  it('translates the slot uniqueness violation into a meaningful conflict', async () => {
    const repository: BookingRepository = {
      create: async () => {
        throw { code: '23505', constraint: 'one_confirmed_booking_per_slot' };
      },
    };
    await expect(
      createBooking(input, customer, repository),
    ).rejects.toMatchObject({ status: 409, code: 'SLOT_UNAVAILABLE' });
  });
  it('does not disguise unexpected database errors as a booking conflict', async () => {
    const error = { code: '23505', constraint: 'bookings_pkey' };
    await expect(
      createBooking(input, customer, {
        create: async () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);
  });
});

describe('owned booking boundary', () => {
  const id = '20000000-0000-4000-8000-000000000001';
  it('rejects malformed ids and staff before a management query', async () => {
    const repository = { list: vi.fn(), find: vi.fn(), cancel: vi.fn() };
    await expect(
      manageBooking('bad', customer, repository, 'find'),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      manageBooking(id, { ...customer, role: 'staff' }, repository, 'cancel'),
    ).rejects.toMatchObject({ status: 403 });
    expect(repository.find).not.toHaveBeenCalled();
    expect(repository.cancel).not.toHaveBeenCalled();
  });
  it('uses the session owner for both read and cancellation and conceals missing bookings', async () => {
    const repository = {
      list: vi.fn(),
      find: vi.fn().mockResolvedValue(null),
      cancel: vi.fn().mockResolvedValue(null),
    };
    for (const action of ['find', 'cancel'] as const) {
      await expect(
        manageBooking(id, customer, repository, action),
      ).rejects.toMatchObject({ status: 404, code: 'BOOKING_NOT_FOUND' });
      expect(repository[action]).toHaveBeenCalledWith(id, customer.id);
    }
  });
});
