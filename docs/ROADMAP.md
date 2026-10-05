# Roadmap

Current milestone: **M1 complete for the local slice; M2 next, deferred**. Scope stops after the first complete booking slice. Later milestones remain deferred. See [backlog](BACKLOG.md) and [execution evidence](VERIFICATION.md).

## M0 — Foundation

- [x] Repository structure
- [x] pnpm package management and lockfile
- [x] Linting / formatting
- [x] Docker / PostgreSQL local setup configuration
- [x] Baseline README
- [x] Architecture document
- [x] AGENTS.md
- [x] ROADMAP.md

Definition of done: Configuration implemented; execution evidence recorded separately.

## M1 — First working booking slice

- [x] Minimal React slot listing and booking UI
- [x] Minimal backend slot-list and booking endpoints
- [x] Users / slots / bookings schema and tracked migration
- [x] Repeatable sample user and slot seed
- [x] Development command to append demo slots after capacity is exhausted
- [x] Focused backend unit tests
- [x] Repeatable startup instructions
- [x] Real PostgreSQL persistence and conflict verification
- [x] Manual browser journey verification
- [ ] Fresh-clone startup using Docker Compose (Docker unavailable in this environment)

Definition of done: Clone, follow README and successfully create a persisted booking.

## M2 — Initial UI Quality Engineering

- [ ] Implement authentication prerequisite and cancellation journey
- [ ] Configure Playwright with approximately 5–10 high-value scenarios
- [ ] Reusable fixtures and controlled test data
- [ ] HTML report, screenshots and traces on failure
- [ ] CI execution and diagnostic artefact publishing

Definition of done: Pull requests run useful UI checks and publish diagnostic evidence.

## M3 — Risk and defect evidence

- [ ] Refine QE strategy and risk register from observations
- [ ] First defect case study
- [ ] One deliberate defect exercise with detection and restoration
- [ ] Evidence-backed release recommendation

Definition of done: A reproducible failure, investigation, fix and regression check are documented.

## M4 — API and database Quality Engineering

- [ ] Authentication / expired or invalid credentials
- [ ] Ownership: Customer A cannot read Customer B booking
- [ ] Ownership: Customer A cannot cancel Customer B booking
- [ ] Malformed input, boundaries and error responses
- [ ] SQL persistence verification
- [ ] Investigate duplicate requests and define idempotency
- [ ] Implement and test idempotent retry semantics

Definition of done: API checks target permissions and persistence without duplicating every UI test.

## M5 — Concurrency

- [ ] 20 simultaneous attempts for the last slot
- [ ] Assert 1 success, 19 conflicts and confirmed SQL count = 1
- [ ] Investigate / fix race if observed
- [ ] Document sequential-test blind spot, evidence and limitations

Definition of done: Capacity is verified with real PostgreSQL under concurrent requests.

## M6 — CI/CD Quality Gates

- [ ] Lint, unit, API, UI smoke and build stages
- [ ] Broader regression where justified
- [ ] Document blocking gates and release reasoning
- [ ] Keep performance outside mandatory PR gates unless justified

Definition of done: Failures block releases for explicit risk reasons, with diagnostic artefacts.

## M7 — Performance engineering

- [ ] Define k6 workload and explicit targets
- [ ] Record environment and actual baseline
- [ ] Investigate one measured bottleneck
- [ ] Retest change and record limitations

Definition of done: No fabricated results; example p95 < 500 ms / error < 1% is only a candidate target.

## M8 — Flaky-test investigation

- [ ] Create or identify one unstable scenario
- [ ] Measure frequency and collect evidence
- [ ] Investigate hypotheses and attempted fixes
- [ ] Resolve root cause and verify stability

Definition of done: Retries assist diagnosis and do not hide instability.

## M9 — Accessibility and non-functional quality

- [ ] Keyboard navigation and accessible names
- [ ] Focused automated accessibility checks
- [ ] Responsive checks where useful
- [ ] Brisbane vs Sydney daylight-saving checks

Definition of done: Focused coverage reflects concrete user risks.

## M10 — AI-assisted Quality Engineering

- [ ] Requirement-to-risk and candidate-test assistance
- [ ] Failure-log summarisation or test review
- [ ] Evaluate generated output and detect hallucinations
- [ ] Record whether AI improves QE effectiveness

Definition of done: Begin only after the core portfolio is credible; avoid test-count gimmicks.
