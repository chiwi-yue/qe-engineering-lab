# Initial backlog

These 30 items are the plan, not completed issues. Milestone checkboxes and execution evidence are authoritative. Suggested layers may evolve with evidence.

## QE-001 — Bootstrap monorepo (M0)

- Goal: Share tooling without fragmented repositories.
- Acceptance criteria: Strict TypeScript workspaces install and build.
- Suggested test level: Static / build.
- QE value: Explainable architecture.

## QE-002 — Add PostgreSQL with Compose (M0)

- Goal: Provide repeatable local persistence.
- Acceptance criteria: Loopback port, health check and named volume documented.
- Suggested test level: Environment smoke.
- QE value: Reproducibility.

## QE-003 — Define users, slots and bookings (M1)

- Goal: Encode persistence invariants.
- Acceptance criteria: Foreign keys, time ordering and confirmed-slot uniqueness exist.
- Suggested test level: SQL / database.
- QE value: Prevent invalid state.

## QE-004 — Seed sample slots and users (M1)

- Goal: Make the local journey reproducible.
- Acceptance criteria: Fixed IDs; reruns preserve bookings; reset documented.
- Suggested test level: Database smoke.
- QE value: Controlled manual data.

## QE-005 — List available slots (M1)

- Goal: Expose bookable future appointments.
- Acceptance criteria: 200 returns chronological future slots excluding confirmed bookings.
- Suggested test level: API / SQL.
- QE value: Availability correctness.

## QE-006 — Create booking (M1)

- Goal: Persist eligible requests safely.
- Acceptance criteria: 201 after insert; invalid 400; ineligible 422; occupied 409.
- Suggested test level: Unit / API / SQL.
- QE value: Capacity and clear failures.

## QE-007 — Minimal booking UI (M1)

- Goal: Exercise the integrated system.
- Acceptance criteria: Customer can list, book and see reference; failures are visible.
- Suggested test level: Manual UI then UI smoke.
- QE value: End-user confidence.

## QE-008 — Unit-test booking boundary (M1)

- Goal: Protect meaningful service behaviour.
- Acceptance criteria: Invalid input avoids persistence; named constraint maps to conflict; unexpected errors propagate.
- Suggested test level: Unit.
- QE value: Fast focused diagnosis.

## QE-009 — Configure Playwright (M2)

- Goal: Create diagnostic UI harness.
- Acceptance criteria: TypeScript config; report; failure trace; no arbitrary sleeps.
- Suggested test level: Harness smoke.
- QE value: Maintainable automation.

## QE-010 — Automate booking journey (M2)

- Goal: Protect primary integration path.
- Acceptance criteria: Isolated customer books a slot and sees confirmation.
- Suggested test level: UI.
- QE value: Meaningful journey coverage.

## QE-011 — Deterministic test data (M2)

- Goal: Enable independent parallel checks.
- Acceptance criteria: Fixtures create scoped users/slots and clean up without cross-test mutation.
- Suggested test level: Fixture / API / SQL.
- QE value: Reliability.

## QE-012 — CI Playwright execution (M2)

- Goal: Run useful PR checks.
- Acceptance criteria: Pinned runtime, service health and reproducible setup; failing checks fail job.
- Suggested test level: CI smoke.
- QE value: Feedback before merge.

## QE-013 — Publish diagnostic artefacts (M2)

- Goal: Make pipeline failures actionable.
- Acceptance criteria: Reports/traces uploaded on failure with retention documented.
- Suggested test level: CI failure exercise.
- QE value: Debuggability.

## QE-014 — Cancellation workflow (M2)

- Goal: Restore capacity under explicit rules.
- Acceptance criteria: Owner cancels; repeated cancel contract defined; slot becomes available.
- Suggested test level: API then UI.
- QE value: State transitions.

## QE-015 — Unavailable slot conflict (M2)

- Goal: Explain contention to callers.
- Acceptance criteria: Occupied-slot request returns 409 and SQL state is unchanged.
- Suggested test level: Unit / API / SQL.
- QE value: Error contract.

## QE-016 — User authentication (M2)

- Goal: Establish trustworthy identity.
- Acceptance criteria: Customer login/logout; registration explicitly deferred from M2; password hashing; malformed/expired tokens denied; no committed credentials.
- Suggested test level: Unit / API / UI login.
- QE value: Security prerequisite.

## QE-017 — Booking ownership (M4)

- Goal: Bind operations to authenticated principal.
- Acceptance criteria: Read/cancel queries scoped to principal; staff access explicitly defined.
- Suggested test level: API.
- QE value: Object-level authorisation.

## QE-018 — Deny cross-customer read (M4)

- Goal: Detect information disclosure.
- Acceptance criteria: Customer A cannot read B booking; response does not leak sensitive data.
- Suggested test level: API.
- QE value: BOLA regression.

## QE-019 — Deny cross-customer cancellation (M4)

- Goal: Protect another customer state.
- Acceptance criteria: A cancellation denied; B booking remains confirmed in SQL.
- Suggested test level: API / SQL.
- QE value: Integrity and permissions.

## QE-020 — SQL persistence checks (M4)

- Goal: Verify stored outcomes independently.
- Acceptance criteria: Assert correct user/slot/state with isolated queries.
- Suggested test level: API / SQL.
- QE value: Beyond response assertions.

## QE-021 — Investigate duplicate submissions (M4)

- Goal: Understand retry failure mode.
- Acceptance criteria: Reproduce ambiguous outcome and record current response/state.
- Suggested test level: Exploratory / API / SQL.
- QE value: Retry semantics.

## QE-022 — Define and implement idempotency (M4)

- Goal: Make retries safe and predictable.
- Acceptance criteria: Key scope, payload mismatch, lifetime and replay contract documented/tested.
- Suggested test level: Unit / API / SQL.
- QE value: Prevent duplicate side effects.

## QE-023 — Concurrent last-slot check (M5)

- Goal: Verify capacity under contention.
- Acceptance criteria: 20 simultaneous attempts yield 1 success, 19 conflicts, SQL count 1.
- Suggested test level: Concurrent API / SQL.
- QE value: Sequential blind spots.

## QE-024 — Race investigation if observed (M5)

- Goal: Build evidence-backed defect story.
- Acceptance criteria: Reproduce failure, isolate cause, fix and retain regression; do not fabricate a race.
- Suggested test level: Concurrent API / SQL.
- QE value: Debugging judgement.

## QE-025 — First defect exercise (M3)

- Goal: Demonstrate failure detection.
- Acceptance criteria: Controlled defect fails regression; restoration passes; evidence documented.
- Suggested test level: Appropriate layer.
- QE value: Investigation narrative.

## QE-026 — Refine risk register (M3)

- Goal: Prioritise testing by impact.
- Acceptance criteria: Each major rule has priority, mitigation, evidence and gap.
- Suggested test level: Review.
- QE value: Coverage judgement.

## QE-027 — Release recommendation (M3)

- Goal: Communicate readiness honestly.
- Acceptance criteria: Scope, executed checks, known defects and deferred risks support GO/risk/NO-GO.
- Suggested test level: Evidence review.
- QE value: Stakeholder communication.

## QE-028 — Performance baseline (M7)

- Goal: Measure defined workload with k6.
- Acceptance criteria: Environment, workload and real p95/error results recorded; no fake numbers.
- Suggested test level: Performance.
- QE value: Measurement literacy.

## QE-029 — Performance bottleneck investigation (M7)

- Goal: Explain a measured improvement.
- Acceptance criteria: Baseline → hypothesis → change → retest with limitations.
- Suggested test level: Performance / profiling.
- QE value: Engineering diagnosis.

## QE-030 — Flaky-test investigation (M8)

- Goal: Resolve instability systematically.
- Acceptance criteria: Frequency, evidence, hypotheses, fix and stability retest documented.
- Suggested test level: Repeated focused execution.
- QE value: Reliability beyond retries.
