# Quality Engineering Lab

A personal engineering project for Senior QE/SDET roles in Australia. The intended evidence includes TypeScript automation, API and SQL validation, CI quality gates, concurrency, debugging and risk-based release decisions. This repository implements M1 and the M2 customer journeys and Playwright harness. A GitHub Actions workflow is configured; its remote execution remains unverified. Concurrency and performance work remain planned.

## Current scope

React UI → Express API → PostgreSQL. Customers log in, browse future available slots, book an appointment, view their bookings, cancel their own booking and log out. The server derives booking ownership from the session. A partial unique index allows only one confirmed booking per slot. The UI shows a persisted booking reference and removes the booked slot.

**Local demo only:** registration, staff login, booking-creation idempotent replay and notifications are deferred. Passwords are hashed and sessions expire, but login rate limiting, deployment/TLS configuration and expired-session cleanup are pending. Disabling the booking button reduces repeated clicks but provides no server-side idempotency guarantee.

## Quick start

Prerequisites: Node.js 22.12+ (Node 24 recommended), pnpm 11.19.0, Docker with Compose. Install pnpm using your normal package-manager setup. Commands below run from the repository root.

```sh
cp .env.example .env
# Edit .env: set DEMO_CUSTOMER_PASSWORD to a local password of 12–128 characters.
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [the booking UI](http://127.0.0.1:5173). Log in as `customer-a@example.test` or `customer-b@example.test` using your locally configured demo password. Choose an appointment; confirmation includes the database booking ID. The API listens on loopback port 3001; Vite proxies `/api` to it. The demo uses Australia/Brisbane display times. Instants are stored with PostgreSQL `timestamptz` and returned as ISO timestamps.

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

To verify persistence manually after booking, use the returned reference:

```sh
docker compose exec db psql -U qe -d qe_lab -c 'SELECT id, slot_id, customer_id, status, created_at FROM bookings;'
```

After booking all three slots, an empty list is expected. To continue exploring without deleting your bookings:

```sh
pnpm db:seed:more
```

Then click **Refresh slots**. This development command appends three appointments at 9, 10 and 11 am Brisbane time on a new day, at least two days ahead and after the latest existing slot date. Each invocation intentionally adds another batch; it does not reset availability or cancel bookings.

Migrations are repeatable and preserve existing data. The baseline seed preserves bookings and slot timestamps, resets the two demo customer password hashes from `.env`, and revokes their sessions. Use `db:seed:more` to add capacity without logging users out. Three deterministic slot IDs are initially seeded two days ahead. When those slots are booked or expired, use `pnpm db:seed:more`. For a completely fresh **disposable local database**, reset it with `docker compose down -v`, then repeat startup. That command deletes all local database data. `docker compose stop` preserves it. `.env` is ignored; Compose credentials are non-secret local demo credentials, not production credentials.

## Service contract

- `GET /api/slots`: public, 200 `{ slots: [{ id, startsAt, endsAt }] }`; future slots without confirmed bookings.
- `POST /api/auth/login`: JSON `{ email, password }`; 200 `{ user }` and an HttpOnly session cookie.
- `GET /api/auth/me`: 200 `{ user }` with a valid session, otherwise 401.
- `POST /api/auth/logout`: revokes the supplied session, clears its cookie, returns 204.
- `POST /api/bookings`: authenticated JSON `{ slotId }`; 201 `{ booking }` after persistence. Supplying `customerId` or another extra field returns 400.
- `GET /api/bookings`: authenticated customer; 200 `{ bookings }`, only the customer's records, including cancelled history and slot times.
- `GET /api/bookings/:id`: authenticated owner; 200 `{ booking }`.
- `POST /api/bookings/:id/cancel`: authenticated owner, JSON `{}`; 200 `{ booking }` with cancelled status. Repeating cancellation returns the same record. No cancellation cutoff or fees in this local lab; only future slots reappear as available.
- 404 `BOOKING_NOT_FOUND`: absent or another customer's booking, with the same response.
- 400: malformed input/JSON or incorrect booking/cancellation shape.
- 401: bad credentials, missing/unknown/invalid/expired session.
- 403: wrong/missing POST Origin or authenticated staff booking-management attempt.
- 409 `SLOT_UNAVAILABLE`: a confirmed booking already exists for the slot.
- 422: missing/past slot (or customer no longer eligible at persistence time).
- 415: login/booking/cancellation request is not JSON; 413: body exceeds 16 KB.
- 500: unexpected server error correlated with `X-Request-ID` and safe server logs.

Browser POSTs must match `APP_ORIGIN` (default `http://127.0.0.1:5173`). Use that exact UI address. If you choose localhost or another port, change APP_ORIGIN and restart the API. Direct API clients must send the same `Origin` header plus the login cookie for protected requests. The old M1 `{slotId, customerId}` booking request is intentionally no longer accepted.

## Testing and evidence

`pnpm test` runs 20 focused checks: nine booking/ownership rules, seven password/session checks and four HTTP boundary checks using a database double. These cannot validate SQL. Eight Chromium scenarios use the real API and PostgreSQL, with targeted API/SQL checks for ownership and cancellation retry rather than duplicating UI clicks.

Set up a separate disposable database once (the demo database stays intact):

```sh
docker compose exec db createdb -U qe qe_lab_test
cp .env.test.example .env.test
# Adjust TEST_DATABASE_URL if your local PostgreSQL port differs.
pnpm exec playwright install chromium
pnpm build
pnpm test:db:migrate
pnpm test:ui
pnpm test:ui:report
```

Test database names must end in `_test`. Tests use ports 5174/3101 and refuse to reuse running servers. Each test creates UUID-scoped customers and a future slot, then deletes only its own bookings, slot, users and sessions. The manual seed is not used. Two workers run independently with zero retries and no arbitrary sleeps. An interrupted/killed run can leave fixtures: use a fresh disposable test database before rerunning if needed; never truncate the manual database. Rebuild after API source changes because the test server uses compiled code.

An HTML report is generated for every run. Failures retain a screenshot, trace, error context and SQL state attachment. Reports/traces are ignored by Git; they can contain temporary login requests/cookies and should be shared with care. See [M2 implementation and measured evidence](docs/M2-IMPLEMENTATION.md) for scenario coverage and diagnostics commands.

[GitHub Actions](.github/workflows/m2.yml) runs static checks, backend checks, build, migrations and Playwright on pull requests and pushes to main. It uploads report/test-results artefacts even after failures, with seven-day retention. The PostgreSQL service is disposable and its password is an ephemeral CI configuration value. **Remote CI execution and upload have not yet been observed**; M2's PR acceptance check remains pending. No performance measurement or completed defect case study is claimed.

## Project documentation

- [Roadmap and current milestone](docs/ROADMAP.md)
- [Backlog with acceptance criteria](docs/BACKLOG.md)
- [Architecture and decisions](docs/ARCHITECTURE.md)
- [Authentication rules and trade-offs](docs/AUTHENTICATION.md)
- [QE strategy](docs/QE-STRATEGY.md)
- [Risk register](docs/RISK-REGISTER.md)
- [Defect case-study index](docs/DEFECT-CASE-STUDIES.md)
- [Case-study template](docs/case-studies/TEMPLATE.md)
- [Release recommendation template](docs/RELEASE-REPORTS.md)
- [Job-market notes](docs/JOB-MARKET-NOTES.md)
- [Future agent guidance](AGENTS.md)

## Practise manually

Explain why checking availability before insertion is insufficient to enforce capacity. Use the SQL query above to inspect a booking, then resend the authenticated `{slotId}` request and explain the 409. Try adding `customerId` and explain why the server returns 400. Do not call that an idempotent retry: it does not replay the original successful response. A controlled simultaneous-request investigation belongs to M5.

AI assistance was used to create this foundation. Implementation and reported verification remain reviewable; future exercises should record measured evidence and the owner's reasoning.
