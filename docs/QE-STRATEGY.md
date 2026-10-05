# QE strategy

## Objective

Produce evidence of engineering judgement rather than maximise automated test count. Every test should name a rule, risk and useful failure signal. Prefer the lowest layer that can establish the behaviour.

## First slice

| Rule / risk                              | Appropriate evidence                           | Current protection                              |
| ---------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| Capacity: one confirmed booking per slot | PostgreSQL constraint plus real database check | Unique index; unit check of 409 mapping         |
| Invalid request must not persist         | Unit input boundary                            | Malformed UUID rejected before repository call  |
| Past/missing slot and staff cannot book  | SQL eligibility plus unit failure contract     | Atomic SQL filter; service rejects empty insert |
| Confirmation means persistence succeeded | Real DB manual check, later API+SQL test       | Response is sent after INSERT returns           |
| User can complete booking                | Manual UI exploration, later UI smoke          | Minimal React journey                           |
| Failure remains diagnosable              | Error correlation and later CI artefacts       | Request ID and server error log                 |

Unit doubles cannot validate SQL, foreign keys or capacity under load. Record real-database verification separately. Shared seed users are only for manual exploration; M2/M4 require isolated data and cleanup. No arbitrary sleeps or test-order dependencies.

## Feature workflow

Write the business rule → assess impact/likelihood → choose test layer → explore useful boundaries → automate focused checks → optionally introduce a controlled local defect → verify detection → restore/fix → document observed evidence → record limitations.

Never invent an observed defect to complete a narrative. Store reproducible steps, environment, exact commands and evidence. Deliberate defects must remain local, be restored and not be confused with production incidents.

## Later layers

M2 covers approximately 5–10 critical UI scenarios with isolated fixtures, observable waits, HTML reports and traces on failure. API checks focus on permissions, boundaries, retry semantics and persistence rather than repeating UI coverage. M5 verifies the 20-request last-slot scenario and SQL count. Performance gets explicit workload/environment/targets and actual measurements, initially outside mandatory PR gates. Accessibility, flaky-test investigation and AI evaluation follow the roadmap.

## Release decisions

Local checks can support a local demonstration recommendation. They cannot support a public-release claim while identity is caller-supplied. Use RELEASE-REPORTS.md to communicate scope, evidence, known defects and deferred risks. Pending checks stay pending.
