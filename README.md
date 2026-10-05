# Quality Engineering Lab

A personal engineering project for Senior QE/SDET roles in Australia. The intended evidence includes TypeScript automation, API and SQL validation, CI quality gates, concurrency, debugging and risk-based release decisions. This repository currently implements the first booking slice; those later capabilities are planned, not claimed as complete.

## Current scope

React UI → Express API → PostgreSQL. A seeded customer can list future available slots and create a booking. A partial unique index allows only one confirmed booking per slot. The UI shows a persisted booking reference and removes the booked slot.

**Local demo only:** there is no authentication. The UI supplies seeded Customer A's ID. A caller can supply another customer's ID. Registration, login, ownership, cancellation, idempotent replay and notifications are deferred. Disabling the button reduces accidental repeated clicks but provides no server-side idempotency guarantee.

## Quick start

Prerequisites: Node.js 22.12+ (Node 24 recommended), pnpm 11.19.0, Docker with Compose. Install pnpm using your normal package-manager setup. Commands below run from the repository root.

```sh
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d --wait
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [the booking UI](http://localhost:5173). Choose an appointment; confirmation includes the database booking ID. The API listens on loopback port 3001; Vite proxies `/api` to it. The demo uses Australia/Brisbane display times. Instants are stored with PostgreSQL `timestamptz` and returned as ISO timestamps.

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

Migrations and the baseline seed are repeatable and do not delete bookings. Three deterministic slot IDs are initially seeded two days ahead. When those slots are booked or expired, use `pnpm db:seed:more`. For a completely fresh **disposable local database**, reset it with `docker compose down -v`, then repeat startup. That command deletes all local database data. `docker compose stop` preserves it. `.env` is ignored; Compose credentials are non-secret local demo credentials, not production credentials.

## Service contract

- `GET /api/slots`: 200 `{ slots: [{ id, startsAt, endsAt }] }`; future slots without confirmed bookings.
- `POST /api/bookings`: JSON `{ slotId, customerId }`; 201 `{ booking }` only after persistence succeeds.
- 400: invalid UUID input or malformed JSON.
- 422: missing/past slot, missing customer or staff user.
- 409 `SLOT_UNAVAILABLE`: a confirmed booking already exists for the slot.
- 500: unexpected server error, correlated with `X-Request-ID` and server logs.

## Test layers and evidence

Five backend unit tests protect input validation, success, eligibility, conflict translation and unexpected-error propagation. Repository doubles make these fast; they do not establish PostgreSQL enforcement. Manual real-database verification is required for this milestone. API automation and Playwright fixtures, traces, screenshots and HTML/CI artefacts start in later milestones.

CI status: no workflow yet; CI execution is planned for M2 and gates expand in M6. No performance measurement or defect case study is claimed. See [verification evidence](docs/VERIFICATION.md) for what actually ran.

## Project documentation

- [Roadmap and current milestone](docs/ROADMAP.md)
- [Backlog with acceptance criteria](docs/BACKLOG.md)
- [Architecture and decisions](docs/ARCHITECTURE.md)
- [QE strategy](docs/QE-STRATEGY.md)
- [Risk register](docs/RISK-REGISTER.md)
- [Defect case-study index](docs/DEFECT-CASE-STUDIES.md)
- [Case-study template](docs/case-studies/TEMPLATE.md)
- [Release recommendation template](docs/RELEASE-REPORTS.md)
- [Job-market notes](docs/JOB-MARKET-NOTES.md)
- [Future agent guidance](AGENTS.md)

## Practise manually

Explain why checking availability before insertion is insufficient to enforce capacity. Use the SQL query above to inspect a booking, then submit the same slot twice and explain the 409. Do not call that an idempotent retry: it does not replay the original successful response. A controlled simultaneous-request investigation belongs to M5.

AI assistance was used to create this foundation. Implementation and reported verification remain reviewable; future exercises should record measured evidence and the owner's reasoning.
