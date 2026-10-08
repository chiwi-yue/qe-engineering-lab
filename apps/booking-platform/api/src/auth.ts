import { createHash, randomBytes } from 'node:crypto';
import { HttpError } from './errors.js';
import { dummyPasswordHash, verifyPassword } from './password.js';
export const SESSION_COOKIE = 'qe_session';
export const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
export interface Principal {
  id: string;
  email: string;
  role: 'customer' | 'staff';
}
export interface LoginUser extends Principal {
  passwordHash: string | null;
}
export interface Session {
  user: Principal;
  expiresAt: Date;
}
export interface AuthRepository {
  findUser(email: string): Promise<LoginUser | null>;
  saveSession(
    tokenHash: string,
    userId: string,
    expiresAt: Date,
  ): Promise<void>;
  findSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
}
export function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
export function readSessionToken(
  cookie: string | undefined,
): string | undefined {
  const tokens = (cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (tokens.length !== 1) return undefined;
  const token = tokens[0].slice(SESSION_COOKIE.length + 1);
  return /^[0-9a-f]{64}$/.test(token) ? token : undefined;
}
export class AuthService {
  constructor(
    private repository: AuthRepository,
    private now: () => number = Date.now,
  ) {}
  async login(value: unknown, previousToken?: string) {
    if (!value || typeof value !== 'object')
      throw new HttpError(
        400,
        'INVALID_LOGIN',
        'Email and password are required.',
      );
    const { email, password } = value as Record<string, unknown>;
    if (
      typeof email !== 'string' ||
      !email.trim() ||
      email.length > 254 ||
      typeof password !== 'string' ||
      !password ||
      password.length > 128
    )
      throw new HttpError(
        400,
        'INVALID_LOGIN',
        'Email and password are required (password maximum 128 characters).',
      );
    const record = await this.repository.findUser(email.trim().toLowerCase());
    const valid = await verifyPassword(
      password,
      record?.passwordHash ?? dummyPasswordHash,
    );
    if (!record || !record.passwordHash || !valid)
      throw new HttpError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      );
    if (record.role !== 'customer')
      throw new HttpError(
        403,
        'CUSTOMER_REQUIRED',
        'Customer login is required for this booking slice.',
      );
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(this.now() + SESSION_MAX_AGE);
    await this.logout(previousToken);
    await this.repository.saveSession(digestToken(token), record.id, expiresAt);
    const user: Principal = {
      id: record.id,
      email: record.email,
      role: record.role,
    };
    return { token, user, expiresAt };
  }
  async authenticate(token: string | undefined): Promise<Principal> {
    if (!token || !/^[0-9a-f]{64}$/.test(token))
      throw new HttpError(401, 'AUTH_REQUIRED', 'Please log in to continue.');
    const session = await this.repository.findSession(digestToken(token));
    if (!session || session.expiresAt.getTime() <= this.now())
      throw new HttpError(401, 'AUTH_REQUIRED', 'Please log in to continue.');
    return session.user;
  }
  async logout(token: string | undefined): Promise<void> {
    if (token && /^[0-9a-f]{64}$/.test(token))
      await this.repository.deleteSession(digestToken(token));
  }
}
