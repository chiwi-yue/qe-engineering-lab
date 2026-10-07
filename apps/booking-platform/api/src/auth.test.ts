import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AuthService,
  digestToken,
  readSessionToken,
  SESSION_MAX_AGE,
  type AuthRepository,
  type LoginUser,
} from './auth.js';
import { hashPassword, verifyPassword } from './password.js';
const password = 'test-only-password-456';
const now = Date.UTC(2026, 9, 6);
let user: LoginUser;
beforeAll(async () => {
  user = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'customer-a@example.test',
    role: 'customer',
    passwordHash: await hashPassword(password),
  };
});
function repository() {
  return {
    findUser: vi.fn<AuthRepository['findUser']>(async () => user),
    saveSession: vi.fn<AuthRepository['saveSession']>(async () => {}),
    findSession: vi.fn<AuthRepository['findSession']>(async () => null),
    deleteSession: vi.fn<AuthRepository['deleteSession']>(async () => {}),
  };
}
describe('password storage', () => {
  it('uses unique salts and rejects wrong passwords or corrupt hashes', async () => {
    const other = await hashPassword(password);
    expect(other).not.toBe(user.passwordHash);
    expect(other).not.toContain(password);
    expect(await verifyPassword(password, other)).toBe(true);
    expect(await verifyPassword('wrong', other)).toBe(false);
    expect(await verifyPassword(password, 'corrupt')).toBe(false);
  });
});
describe('authentication', () => {
  it('creates a fresh session, stores only its digest, and rotates an existing session', async () => {
    const repo = repository();
    const oldToken = 'a'.repeat(64);
    const result = await new AuthService(repo, () => now).login(
      { email: ' CUSTOMER-A@EXAMPLE.TEST ', password },
      oldToken,
    );
    expect(repo.findUser).toHaveBeenCalledWith(user.email);
    expect(result.user).toEqual({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    expect(repo.saveSession).toHaveBeenCalledWith(
      digestToken(result.token),
      user.id,
      new Date(now + SESSION_MAX_AGE),
    );
    expect(repo.deleteSession).toHaveBeenCalledWith(digestToken(oldToken));
  });
  it('rejects malformed login without querying credentials', async () => {
    const repo = repository();
    await expect(
      new AuthService(repo).login({ email: user.email }),
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.findUser).not.toHaveBeenCalled();
  });
  it('returns the same denial for unknown users and incorrect passwords', async () => {
    const repo = repository();
    const auth = new AuthService(repo);
    const expected = {
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    };
    await expect(
      auth.login({ email: user.email, password: 'wrong' }),
    ).rejects.toMatchObject(expected);
    repo.findUser.mockResolvedValue(null);
    await expect(
      auth.login({ email: 'missing@example.test', password }),
    ).rejects.toMatchObject(expected);
    expect(repo.saveSession).not.toHaveBeenCalled();
  });
  it('rejects missing, malformed, unknown and expired sessions, including the exact expiry instant', async () => {
    const repo = repository();
    const auth = new AuthService(repo, () => now);
    await expect(auth.authenticate(undefined)).rejects.toMatchObject({
      status: 401,
    });
    await expect(auth.authenticate('invalid')).rejects.toMatchObject({
      status: 401,
    });
    expect(repo.findSession).not.toHaveBeenCalled();
    const token = 'b'.repeat(64);
    await expect(auth.authenticate(token)).rejects.toMatchObject({
      status: 401,
    });
    repo.findSession.mockResolvedValue({ user, expiresAt: new Date(now) });
    await expect(auth.authenticate(token)).rejects.toMatchObject({
      status: 401,
    });
    repo.findSession.mockResolvedValue({ user, expiresAt: new Date(now + 1) });
    expect(await auth.authenticate(token)).toEqual(user);
  });
  it('deletes the hashed session on logout; absent sessions can log out safely', async () => {
    const repo = repository();
    const auth = new AuthService(repo);
    const token = 'c'.repeat(64);
    await auth.logout(token);
    await auth.logout(undefined);
    expect(repo.deleteSession).toHaveBeenCalledExactlyOnceWith(
      digestToken(token),
    );
  });
  it('rejects malformed or ambiguous session cookies', () => {
    const token = 'd'.repeat(64);
    expect(readSessionToken(`other=x; qe_session=${token}`)).toBe(token);
    expect(readSessionToken('qe_session=bad')).toBeUndefined();
    expect(
      readSessionToken(`qe_session=${token}; qe_session=${token}`),
    ).toBeUndefined();
  });
});
