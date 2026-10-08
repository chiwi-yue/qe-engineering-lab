export function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value)
    throw new Error(
      'TEST_DATABASE_URL is required; copy .env.test.example to .env.test.',
    );
  const url = new URL(value);
  if (!decodeURIComponent(url.pathname.slice(1)).endsWith('_test'))
    throw new Error(
      'Test database name must end in _test. Never use the manual demo database.',
    );
  return value;
}
