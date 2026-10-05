import { describe, expect, it, vi } from 'vitest';
import { createBooking, type BookingRepository } from './booking.js';
const input = {
  slotId: '10000000-0000-4000-8000-000000000009',
  customerId: '00000000-0000-4000-8000-000000000001',
};
describe('booking boundary', () => {
  it('rejects malformed identifiers before accessing persistence', async () => {
    const create = vi.fn();
    await expect(
      createBooking({ ...input, slotId: 'bad' }, { create }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' });
    expect(create).not.toHaveBeenCalled();
  });
  it('returns the persisted booking for eligible input', async () => {
    const create = vi.fn(async (data, id) => ({
      ...data,
      id,
      status: 'confirmed' as const,
      createdAt: '2026-10-06T00:00:00Z',
    }));
    const result = await createBooking(input, { create });
    expect(result).toMatchObject({ ...input, status: 'confirmed' });
    expect(create).toHaveBeenCalledWith(input, result.id);
  });
  it('rejects an absent, past slot or non-customer', async () => {
    await expect(
      createBooking(input, { create: async () => null }),
    ).rejects.toMatchObject({ status: 422, code: 'INELIGIBLE_BOOKING' });
  });
  it('translates the slot uniqueness violation into a meaningful conflict', async () => {
    const repository: BookingRepository = {
      create: async () => {
        throw { code: '23505', constraint: 'one_confirmed_booking_per_slot' };
      },
    };
    await expect(createBooking(input, repository)).rejects.toMatchObject({
      status: 409,
      code: 'SLOT_UNAVAILABLE',
    });
  });
  it('does not disguise unexpected database errors as a booking conflict', async () => {
    const error = { code: '23505', constraint: 'bookings_pkey' };
    await expect(
      createBooking(input, {
        create: async () => {
          throw error;
        },
      }),
    ).rejects.toBe(error);
  });
});
