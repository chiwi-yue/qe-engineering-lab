import { spawn } from 'node:child_process';
import { testDatabaseUrl } from './test-environment.mjs';

const server = spawn(
  process.execPath,
  ['apps/booking-platform/api/dist/server.js'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl(),
      PORT: '3101',
      APP_ORIGIN: 'http://127.0.0.1:5174',
      NODE_ENV: 'test',
    },
  },
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.kill(signal));
server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
