import express from 'express';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { BookingError, createBooking } from './booking.js';
import { PostgresBookingRepository } from './repository.js';
export function createApp(pool: Pool) {
  const app = express();
  app.use((_req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId);
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/slots', async (_req, res) => {
    const result =
      await pool.query(`SELECT s.id, s.starts_at AS "startsAt", s.ends_at AS "endsAt"
      FROM appointment_slots s WHERE s.starts_at > now() AND NOT EXISTS
      (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status = 'confirmed') ORDER BY s.starts_at, s.id`);
    res.json({ slots: result.rows });
  });
  app.post('/api/bookings', async (req, res) => {
    const booking = await createBooking(
      req.body,
      new PostgresBookingRepository(pool),
    );
    res.status(201).json({ booking });
  });
  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof BookingError) {
        res.status(error.status).json({
          error: { code: error.code, message: error.message },
          requestId: res.locals.requestId,
        });
        return;
      }
      if (
        error &&
        typeof error === 'object' &&
        'type' in error &&
        error.type === 'entity.parse.failed'
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON.',
          },
        });
        return;
      }
      console.error({ requestId: res.locals.requestId, error });
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unable to complete request.',
        },
        requestId: res.locals.requestId,
      });
    },
  );
  return app;
}
