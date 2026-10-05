# Risk register

Priority combines consequence and plausibility; these are initial assessments, not measured incident rates. Revisit after investigation.

| ID  | Risk / rule                                          | Priority                | Current mitigation / gap                                         | Planned evidence                               |
| --- | ---------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| R01 | Double booking: one confirmed booking per slot       | High                    | DB partial unique index; concurrency unverified                  | M5 simultaneous attempts + SQL count           |
| R02 | Customer reads/cancels someone else's booking        | Critical for public use | No identity or ownership yet; local demo only                    | M2 auth prerequisites / M4 object-level denial |
| R03 | Retry duplicates operation or loses original outcome | High                    | Same-slot retry conflicts; no key/replay semantics               | M4 idempotency decision and API+SQL            |
| R04 | Notification timeout invalidates booking             | High                    | No notification integration yet                                  | Explicit persisted-state/error exercise        |
| R05 | Brisbane/Sydney DST display differs incorrectly      | Medium                  | timestamptz + Brisbane formatting; no Sydney checks              | M9 fixed instants around DST                   |
| R06 | Expired/malformed token accepted                     | Critical for public use | No tokens implemented                                            | Auth expiry/signature/role coverage            |
| R07 | Invalid, past or staff booking persists              | High                    | UUID boundary + SQL eligibility; direct SQL can bypass role rule | Unit and real database checks                  |
| R08 | Test data leaks across tests                         | Medium                  | Manual seeds only; test fixtures deferred                        | M2/M4 isolation and parallel runs              |
| R09 | Ambiguous network failure causes unsafe retry        | High                    | UI tells user outcome may have persisted                         | M4 idempotent retry + failure injection        |
| R10 | CI failures lack diagnostic evidence                 | Medium                  | Request IDs locally; CI not configured                           | M2 report/trace upload                         |
| R11 | Database migration/seed breaks reproducibility       | Medium                  | Transactional tracked migration; non-destructive fixed-ID seeds  | Repeated startup and migration checks          |
| R12 | Misleading performance claims                        | High for credibility    | No benchmarks claimed                                            | M7 environment/workload/measured results       |
