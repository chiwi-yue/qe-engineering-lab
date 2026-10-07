import type { Pool } from 'pg';
import type { AuthRepository, LoginUser, Principal, Session } from './auth.js';
export class PostgresAuthRepository implements AuthRepository {
  constructor(private pool: Pool) {}
  async findUser(email: string): Promise<LoginUser | null> {
    const result = await this.pool.query<LoginUser>(
      'SELECT id, email, role, password_hash AS "passwordHash" FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] ?? null;
  }
  async saveSession(
    tokenHash: string,
    userId: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.pool.query(
      'INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, userId, expiresAt],
    );
  }
  async findSession(tokenHash: string): Promise<Session | null> {
    const result = await this.pool.query<Principal & { expiresAt: Date }>(
      `SELECT u.id, u.email, u.role, s.expires_at AS "expiresAt" FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0];
    return row
      ? {
          user: { id: row.id, email: row.email, role: row.role },
          expiresAt: row.expiresAt,
        }
      : null;
  }
  async deleteSession(tokenHash: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE token_hash = $1', [
      tokenHash,
    ]);
  }
}
