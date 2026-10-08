import pg from 'pg';
import { createApp } from './app.js';
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required. Copy .env.example to .env.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query('SELECT 1');
const server = createApp(pool, {
  origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:5173',
  secureCookies: process.env.NODE_ENV === 'production',
}).listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () =>
  console.log('Booking API listening on http://127.0.0.1:3001'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(() => {
      void pool.end();
    });
  });
