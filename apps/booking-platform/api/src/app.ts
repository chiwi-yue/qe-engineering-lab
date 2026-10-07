import express from 'express';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { createBooking, manageBooking, requireCustomer } from './booking.js';
import { HttpError } from './errors.js';
import { PostgresBookingRepository } from './repository.js';
import { PostgresAuthRepository } from './auth-repository.js';
import {
  AuthService,
  readSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from './auth.js';

export function createApp(
  pool: Pool,
  options = { origin: 'http://127.0.0.1:5173', secureCookies: false },
) {
  const app = express();
  const auth = new AuthService(new PostgresAuthRepository(pool));
  const bookings = new PostgresBookingRepository(pool);
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: options.secureCookies,
    path: '/api',
  };
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId);
    next();
  });
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', (req, _res, next) => {
    if (req.method === 'POST') {
      if (req.get('Origin') !== options.origin)
        throw new HttpError(
          403,
          'ORIGIN_DENIED',
          'Request origin is not allowed.',
        );
      if (req.path !== '/auth/logout' && !req.is('application/json'))
        throw new HttpError(415, 'JSON_REQUIRED', 'Use application/json.');
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.post('/api/auth/login', async (req, res) => {
    const result = await auth.login(
      req.body,
      readSessionToken(req.get('Cookie')),
    );
    res.cookie(SESSION_COOKIE, result.token, {
      ...cookieOptions,
      maxAge: SESSION_MAX_AGE,
    });
    res.json({ user: result.user });
  });
  app.get('/api/auth/me', async (req, res) => {
    res.json({
      user: await auth.authenticate(readSessionToken(req.get('Cookie'))),
    });
  });
  app.post('/api/auth/logout', async (req, res) => {
    await auth.logout(readSessionToken(req.get('Cookie')));
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.sendStatus(204);
  });
  app.get('/api/slots', async (_req, res) => {
    const result =
      await pool.query(`SELECT s.id, s.starts_at AS "startsAt", s.ends_at AS "endsAt"
      FROM appointment_slots s WHERE s.starts_at > now() AND NOT EXISTS
      (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status = 'confirmed') ORDER BY s.starts_at, s.id`);
    res.json({ slots: result.rows });
  });
  app.post('/api/bookings', async (req, res) => {
    const customer = await auth.authenticate(
      readSessionToken(req.get('Cookie')),
    );
    const booking = await createBooking(req.body, customer, bookings);
    res.status(201).json({ booking });
  });
  app.get('/api/bookings', async (req, res) => {
    const customer = await auth.authenticate(
      readSessionToken(req.get('Cookie')),
    );
    requireCustomer(customer);
    res.json({ bookings: await bookings.list(customer.id) });
  });
  app.get('/api/bookings/:id', async (req, res) => {
    const customer = await auth.authenticate(
      readSessionToken(req.get('Cookie')),
    );
    res.json({
      booking: await manageBooking(req.params.id, customer, bookings, 'find'),
    });
  });
  app.post('/api/bookings/:id/cancel', async (req, res) => {
    const customer = await auth.authenticate(
      readSessionToken(req.get('Cookie')),
    );
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length
    )
      throw new HttpError(
        400,
        'INVALID_INPUT',
        'Cancellation requires an empty JSON object.',
      );
    res.json({
      booking: await manageBooking(req.params.id, customer, bookings, 'cancel'),
    });
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
      if (error instanceof HttpError) {
        res.status(error.status).json({
          error: { code: error.code, message: error.message },
          requestId: res.locals.requestId,
        });
        return;
      }
      if (error && typeof error === 'object' && 'type' in error) {
        if (error.type === 'entity.parse.failed') {
          res.status(400).json({
            error: {
              code: 'INVALID_JSON',
              message: 'Request body must be valid JSON.',
            },
          });
          return;
        }
        if (error.type === 'entity.too.large') {
          res.status(413).json({
            error: {
              code: 'BODY_TOO_LARGE',
              message: 'Request body exceeds 16 KB.',
            },
          });
          return;
        }
      }
      // Never log request bodies, cookies, passwords or database query parameters.
      console.error({
        requestId: res.locals.requestId,
        errorType: error instanceof Error ? error.name : 'Unknown',
      });
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
