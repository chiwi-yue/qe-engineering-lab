import { randomUUID } from 'node:crypto';

import { HttpError } from './errors.js';
import type { Principal } from './auth.js';

export interface BookingInput {
  slotId: string;
  customerId: string;
}
export interface Booking {
  id: string;
  slotId: string;
  customerId: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}
export interface OwnedBooking extends Booking {
  startsAt: string;
  endsAt: string;
}
export interface BookingManagementRepository {
  list(customerId: string): Promise<OwnedBooking[]>;
  find(id: string, customerId: string): Promise<OwnedBooking | null>;
  cancel(id: string, customerId: string): Promise<OwnedBooking | null>;
}
export function requireCustomer(customer: Principal): void {
  if (customer.role !== 'customer')
    throw new HttpError(
      403,
      'CUSTOMER_REQUIRED',
      'A customer session is required.',
    );
}
export async function manageBooking(
  id: string,
  customer: Principal,
  repository: BookingManagementRepository,
  action: 'find' | 'cancel',
): Promise<OwnedBooking> {
  requireCustomer(customer);
  if (!uuid.test(id))
    throw new HttpError(400, 'INVALID_INPUT', 'bookingId must be a UUID.');
  const booking = await repository[action](id, customer.id);
  if (!booking)
    throw new HttpError(404, 'BOOKING_NOT_FOUND', 'Booking not found.');
  return booking;
}
export interface BookingRepository {
  create(input: BookingInput, id: string): Promise<Booking | null>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseBookingInput(
  value: unknown,
  customer: Principal,
): BookingInput {
  if (!value || typeof value !== 'object')
    throw new HttpError(400, 'INVALID_INPUT', 'slotId must be a UUID.');
  if (customer.role !== 'customer')
    throw new HttpError(
      403,
      'CUSTOMER_REQUIRED',
      'Only customers may book appointments.',
    );
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key !== 'slotId'))
    throw new HttpError(
      400,
      'INVALID_INPUT',
      'Provide only slotId; the customer comes from your session.',
    );
  const { slotId } = body;
  if (typeof slotId !== 'string' || !uuid.test(slotId)) {
    throw new HttpError(400, 'INVALID_INPUT', 'slotId must be a UUID.');
  }
  return { slotId, customerId: customer.id };
}
export async function createBooking(
  value: unknown,
  customer: Principal,
  repository: BookingRepository,
): Promise<Booking> {
  const input = parseBookingInput(value, customer);
  try {
    const booking = await repository.create(input, randomUUID());
    if (!booking)
      throw new HttpError(
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
      throw new HttpError(
        409,
        'SLOT_UNAVAILABLE',
        'This slot has already been booked.',
      );
    }
    throw error;
  }
}
