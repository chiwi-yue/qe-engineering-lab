import { randomUUID } from 'node:crypto';

export class BookingError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export interface BookingInput {
  slotId: string;
  customerId: string;
}
export interface Booking {
  id: string;
  slotId: string;
  customerId: string;
  status: 'confirmed';
  createdAt: string;
}
export interface BookingRepository {
  create(input: BookingInput, id: string): Promise<Booking | null>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseBookingInput(value: unknown): BookingInput {
  if (!value || typeof value !== 'object')
    throw new BookingError(
      400,
      'INVALID_INPUT',
      'slotId and customerId must be UUIDs.',
    );
  const { slotId, customerId } = value as Record<string, unknown>;
  if (
    typeof slotId !== 'string' ||
    typeof customerId !== 'string' ||
    !uuid.test(slotId) ||
    !uuid.test(customerId)
  ) {
    throw new BookingError(
      400,
      'INVALID_INPUT',
      'slotId and customerId must be UUIDs.',
    );
  }
  return { slotId, customerId };
}
export async function createBooking(
  value: unknown,
  repository: BookingRepository,
): Promise<Booking> {
  const input = parseBookingInput(value);
  try {
    const booking = await repository.create(input, randomUUID());
    if (!booking)
      throw new BookingError(
        422,
        'INELIGIBLE_BOOKING',
        'A future slot and a customer user are required.',
      );
    return booking;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'constraint' in error &&
      error.code === '23505' &&
      error.constraint === 'one_confirmed_booking_per_slot'
    ) {
      throw new BookingError(
        409,
        'SLOT_UNAVAILABLE',
        'This slot has already been booked.',
      );
    }
    throw error;
  }
}
