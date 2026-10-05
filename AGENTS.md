# Quality Engineering Lab — agent guidance

## Purpose

This repository demonstrates Senior Quality Engineering capability for Australian QE/SDET roles. The booking platform is a realistic system under test, not a consumer product or Playwright tutorial.

## Core principles

- Prioritise meaningful risks; avoid test-count vanity metrics.
- Prefer the appropriate test layer: unit for logic, API for service boundaries, SQL for persistence, UI for critical integration journeys.
- Keep tests deterministic, isolated and independent of order. No arbitrary sleeps or retries that hide instability.
- Document important decisions and produce reproducible evidence.
- Never fabricate benchmarks, defects, execution results or performance claims. Distinguish measured results from assumptions.
- Keep code and abstractions explainable by a human in an interview.
- AI may assist implementation; architecture, limitations and results must remain understandable.
- Avoid unnecessary frameworks, giant Page Object hierarchies and product polish.

## Before significant implementation

1. Inspect repository state and existing changes.
2. Read docs/ROADMAP.md and identify the current milestone.
3. Do not repeat completed work or jump several milestones without explicit instruction.
4. Finish vertical slices before adding skeletons.
5. Update architecture, behaviour, risks and startup documentation when they change.
6. Run relevant checks. Record failures and unverified checks honestly.

## Working conventions

Use a single pnpm monorepo, TypeScript, React, Express and PostgreSQL. Keep PostgreSQL invariants in the database. Use local demo users only until authentication is implemented; never describe caller-supplied customer IDs as secure authentication. Do not expose this unauthenticated slice publicly.

Meaningful work should follow backlog item → branch → implementation → tests → PR → review → merge. Do not make artificial commits, merge automatically, or publish without user instruction. The initial foundation may remain uncommitted for review.

## Interview value

For technically interesting work consider a case study, defect report, diagram, benchmark, release note or interview talking point. Explain requirement, risk, test approach, observed failure, investigation, root cause, resolution, regression protection and trade-offs. Only record observed failures as observations. Suggest a small manual debugging exercise before revealing a major exercise solution when practical.
