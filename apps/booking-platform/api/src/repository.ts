import type { Pool } from 'pg';
import type {
  Booking,
  BookingInput,
  BookingRepository,
  BookingManagementRepository,
  OwnedBooking,
} from './booking.js';
type OwnedRow = Omit<OwnedBooking, 'createdAt' | 'startsAt' | 'endsAt'> & {
  createdAt: Date;
  startsAt: Date;
  endsAt: Date;
};
const columns = `b.id, b.slot_id AS "slotId", b.customer_id AS "customerId", b.status,
  b.created_at AS "createdAt", s.starts_at AS "startsAt", s.ends_at AS "endsAt"`;
const owned = (row: OwnedRow): OwnedBooking => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
});
export class PostgresBookingRepository
  implements BookingRepository, BookingManagementRepository
{
  constructor(private pool: Pool) {}
  async list(customerId: string): Promise<OwnedBooking[]> {
    const result = await this.pool.query<OwnedRow>(
      `SELECT ${columns} FROM bookings b JOIN appointment_slots s ON s.id = b.slot_id WHERE b.customer_id = $1 ORDER BY s.starts_at, b.id`,
      [customerId],
    );
    return result.rows.map(owned);
  }
  async find(id: string, customerId: string): Promise<OwnedBooking | null> {
    const result = await this.pool.query<OwnedRow>(
      `SELECT ${columns} FROM bookings b JOIN appointment_slots s ON s.id = b.slot_id WHERE b.id = $1 AND b.customer_id = $2`,
      [id, customerId],
    );
    return result.rows[0] ? owned(result.rows[0]) : null;
  }
  async cancel(id: string, customerId: string): Promise<OwnedBooking | null> {
    // Ownership is part of the atomic write. Repeating cancellation preserves the same state.
    const result = await this.pool.query<OwnedRow>(
      `WITH changed AS (
      UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND customer_id = $2 RETURNING *
    ) SELECT ${columns} FROM changed b JOIN appointment_slots s ON s.id = b.slot_id`,
      [id, customerId],
    );
    return result.rows[0] ? owned(result.rows[0]) : null;
  }
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
