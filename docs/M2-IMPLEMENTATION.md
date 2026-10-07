# M2 implementation and execution evidence

Executed 7 October 2026, Australia/Brisbane. Covers QE-009 through QE-016; registration remains explicitly deferred. Authentication was already implemented at the [earlier checkpoint](M2-PLAN-REVIEW.md). This work completes own-booking visibility, cancellation and the local automation harness. Remote PR execution is still pending.

## Behaviour

Customers can view their confirmed and cancelled bookings with appointment times. Listing, individual reads and cancellation use the authenticated customer ID. Missing and foreign booking IDs return the same 404. Malformed IDs return 400 and staff management is denied with 403.

Cancellation requires an empty JSON object, retains history and returns 200 with the cancelled record. Repeated cancellation returns the same state. An atomic owner-scoped SQL update releases the existing confirmed-slot constraint; another customer can then book the future slot. Past appointments can be cancelled in this lab but do not become available. No fee or cancellation deadline is modelled. Creation retry still returns 409 rather than replaying a successful response; M4 idempotency remains deferred.

## Automated scenarios and test layers

| Scenario                     | Main risk and evidence                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Login → reload → logout      | Browser session survives reload; logout produces 401 and removes its SQL session                   |
| Wrong password               | Generic visible rejection; no authenticated session                                                |
| Logged-out booking           | Disabled UI; bypass request returns 401 and persists no row                                        |
| Successful booking           | 201, own-booking card and reload persistence; SQL owner/status                                     |
| Stale available slot         | Customer B books after A loads; A's click returns 409, refresh removes slot; one confirmed SQL row |
| Owner cancellation/rebooking | Cancelled card and restored availability; B can book; SQL retains A's cancelled history            |
| Repeated cancellation        | API returns the same cancelled booking twice; one SQL row remains                                  |
| Cross-customer denial        | B's UI/list excludes A's booking; individual read/cancel return 404; SQL remains confirmed for A   |

The retry scenario primarily uses API/SQL because the UI removes the cancel action after cancellation. The other scenarios use UI where it establishes useful integration evidence. Unit checks cover malformed IDs and staff denial before persistence. These checks do not constitute the broader M4 boundary suite or the M5 simultaneous-write exercise.

## Environment and observed checks

macOS, Node 24.19.0, pnpm 11.19.0, Playwright 1.63.0, Chromium 153.0.8010.12 and a real local PostgreSQL 18.4 server. Docker was unavailable; configured PostgreSQL 17.6 startup remains unverified. Local sandbox execution needed elevated permissions for sockets/browser processes and the existing pnpm store required `pnpm_config_verify_deps_before_run=false`.

| Command / check          | Observed result                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `pnpm lint`              | Passed                                                                                    |
| `pnpm typecheck`         | API, web and Playwright sources passed                                                    |
| `pnpm build`             | API compilation and frontend production build passed                                      |
| `pnpm test`              | 20 passed: 9 booking/ownership, 7 password/session, 4 HTTP boundary checks                |
| `pnpm test:db:migrate`   | Both existing migrations applied to the dedicated database                                |
| First `pnpm test:ui`     | 7 passed, 1 failed due to incorrect expected error wording in the new test                |
| Corrected `pnpm test:ui` | 8 passed with two workers and zero retries (reported run duration 4.9 s; not a benchmark) |
| Failure diagnostics      | HTML report, screenshot, trace ZIP with network stream and scoped SQL attachment produced |
| SQL cleanup              | Dedicated database had 0 users, slots, bookings and sessions after the run                |
| Manual demo preservation | Still 3 users, 9 slots and 8 bookings in `qe_lab`                                         |

The initial test expected “Invalid email or password.” but the existing service returned “Email or password is incorrect.” Inspection confirmed an assertion wording mismatch, not an authentication failure. The test was corrected to the existing contract; no product behaviour was changed to satisfy it. Original diagnostics were copied to ignored `diagnostic-evidence/first-run/` before the green run replaced the current report. This is diagnostic evidence, not a claimed product defect case study.

## Reproduction and diagnostics

Follow README's dedicated test database setup, then run:

```sh
pnpm build
pnpm test:db:migrate
pnpm test:ui
pnpm test:ui:report
```

Playwright uses its own API/web processes on 3101/5174 and refuses to attach to existing servers. A database name ending in `_test` is required; manual `.env` is never loaded by these test scripts. Each scenario creates two random customers, generated credentials and one future appointment. Assertions target allocated UUIDs, so another worker's appointment does not interfere. On failure, scoped SQL state is attached before a transaction deletes only fixture-owned rows; sessions cascade when those users are removed. Cleanup does not truncate shared tables. A killed process can leave fixtures, so use a fresh disposable test database when recovering from interruption. This run verified normal pass and assertion-failure cleanup, not recovery from forced process termination.

For a failed run, open the HTML report to inspect the screenshot, error context, SQL attachment and trace. Alternatively:

```sh
pnpm exec playwright show-trace test-results/<failed-scenario>/trace.zip
```

For the retained first-run evidence on this machine:

```sh
pnpm exec playwright show-report diagnostic-evidence/first-run/playwright-report
```

Passing traces are discarded; screenshots are saved on failure; videos are disabled. Reports/traces can include temporary credentials/cookies from requests. Fixtures revoke those sessions during cleanup. Keep diagnostic access scoped and avoid committing raw reports. The configuration follows Playwright's [web server](https://playwright.dev/docs/test-webserver), [diagnostic options](https://playwright.dev/docs/test-use-options) and [CI guidance](https://playwright.dev/docs/ci).

## CI acceptance and remaining scope

The workflow runs on pull requests, pushes to main and manual dispatch. It provisions PostgreSQL 17.6, installs Chromium, runs static/backend/build checks, applies migrations and runs Playwright. The artefact step runs after success or failure unless the job was cancelled; report/test-results retention is seven days. There are no test retries to turn a failure into a passing result.

**No GitHub execution, PR check status or remote artefact upload is claimed.** The branch must be reviewed/published and a PR run observed before checking M2's final acceptance box. Inspect a failing PR's uploaded diagnostics as well as a green result to verify that remote upload works. No commit, push or merge was performed as part of this implementation request.

Fresh-clone Compose startup, broader API/security coverage, booking-creation idempotency, concurrent capacity, performance, public deployment and the M3 product-defect exercise remain separate work. Existing local evidence supports continued development, not public release.
