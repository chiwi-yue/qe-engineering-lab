import type { Pool } from 'pg';
import type { Booking, BookingInput, BookingRepository } from './booking.js';
export class PostgresBookingRepository implements BookingRepository {
  constructor(private pool: Pool) {}
  async create(input: BookingInput, id: string): Promise<Booking | null> {
    const result = await this.pool.query<
      Omit<Booking, 'createdAt'> & { createdAt: Date }
    >(
      `
      INSERT INTO bookings (id, slot_id, customer_id)
      SELECT $1, s.id, u.id FROM appointment_slots s CROSS JOIN users u
      WHERE s.id = $2 AND s.starts_at > now() AND u.id = $3 AND u.role = 'customer'
      RETURNING id, slot_id AS "slotId", customer_id AS "customerId", status, created_at AS "createdAt"
    `,
      [id, input.slotId, input.customerId],
    );
    const row = result.rows[0];
    return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
  }
}
