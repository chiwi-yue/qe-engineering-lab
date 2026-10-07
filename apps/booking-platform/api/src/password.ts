import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const prefix = 'scrypt$131072$8$1';
// OWASP's N=2^17, r=8, p=1 option; maxmem includes algorithm overhead.
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      32,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${prefix}$${salt.toString('hex')}$${key.toString('hex')}`;
}
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (
    parts.length !== 6 ||
    parts.slice(0, 4).join('$') !== prefix ||
    !/^[0-9a-f]{32}$/.test(parts[4]) ||
    !/^[0-9a-f]{64}$/.test(parts[5])
  )
    return false;
  const actual = await derive(password, Buffer.from(parts[4], 'hex'));
  return timingSafeEqual(actual, Buffer.from(parts[5], 'hex'));
}
// Missing users still incur the password-verification work; no claim of timing equivalence.
export const dummyPasswordHash = `${prefix}$${'0'.repeat(32)}$${'0'.repeat(64)}`;
