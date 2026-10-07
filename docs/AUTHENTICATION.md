# Customer authentication — M2

## Requirement and risk

A booking requires a logged-in customer. The server must use the verified identity as the booking owner; changing request data cannot impersonate another customer. M1 deliberately used caller-supplied identity for its local slice. Creation, read and cancellation derive ownership from the verified session.

## Contract

- Public GET /api/slots lists future available slots.
- POST /api/auth/login accepts email/password, normalises email, returns safe user fields and a fresh session cookie. Wrong password and unknown user share a generic 401 response. Staff login is outside this slice.
- GET /api/auth/me returns the principal for a valid session or 401.
- POST /api/bookings accepts only `{slotId}`. Missing/invalid/expired sessions produce 401. Staff cannot book. Caller-supplied customerId and extra fields produce 400 before booking persistence.
- GET /api/bookings returns only the customer’s records. GET /api/bookings/:id and POST /api/bookings/:id/cancel return 404 for missing or foreign records. Staff access returns 403. Cancellation requires `{}`, preserves history and can be repeated safely.
- POST /api/auth/logout deletes the supplied session and clears the cookie. Replaying the old cookie produces 401. Logging out without a session is safe and returns 204 with a valid Origin.
- POSTs require exact APP_ORIGIN; login, booking and cancellation also require application/json. A CLI must explicitly supply Origin and carry the cookie.

## Decisions

Use opaque sessions rather than JWTs: PostgreSQL makes revocation and expiry inspectable, and this local single-service lab needs no independently verified access tokens. Tokens contain 32 cryptographically random bytes. Only their SHA-256 digests are stored. No browser localStorage token is used.

The cookie is HttpOnly, SameSite=Strict, host-only, Path=/api, and expires after eight hours. NODE_ENV=production enables Secure; local HTTP development does not. The API checks expiry on every protected request using its clock. Login with an existing session rotates it; logout revokes it. Other independently created sessions can remain active. Browser reload restores identity through /auth/me.

Passwords use Node's asynchronous scrypt, unique 16-byte salts, N=131072/r=8/p=1, a 32-byte derived key and timingSafeEqual for the derived-key comparison. These parameters follow an [OWASP scrypt option](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Missing users still incur a dummy verification; this is not a claim of timing indistinguishability. Origin checking, JSON enforcement and SameSite follow the relevant [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) for the narrow local deployment. A future shared-domain/deployed system needs its protection reviewed.

Passwords and session cookies are not logged. Unexpected errors emit a request ID and error type; richer sanitised diagnostics can be added when needed.

## Local credentials and migration

Set DEMO_CUSTOMER_PASSWORD in ignored .env to 12–128 characters, then run db:migrate and db:seed. Both customer-a@example.test and customer-b@example.test use that local demo password, with independently salted database hashes. These shared manual-demo credentials are not automated-test fixtures.

Migration 002 preserves M1 users/bookings, adds nullable password_hash and a sessions table. Existing users cannot log in until credential seeding. Rerunning db:seed resets the customer hashes and revokes their sessions while preserving bookings. db:seed:more only appends appointment capacity.

## Deferred scope and limitations

Registration, staff login, password reset, login rate limiting, expiry-record cleanup, deployment/TLS and broader security testing remain pending. This is not a public-release recommendation. Origin headers can be supplied by CLI clients; they protect browser request context, not identity. The session establishes identity.

## Manual exercise

While logged in, inspect the booking request: it contains only slotId. Replay it with customerId for Customer B; expect 400 and no row. Replay without the session; expect 401. Then explain why knowing someone's user ID cannot authorise a booking. Use M2-VERIFICATION.md for observed evidence.

Current real API/SQL and UI regression evidence: [M2 implementation](M2-IMPLEMENTATION.md). Automated credentials are generated per test and cleaned up, separately from the manual seed.
