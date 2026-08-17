# Prompt 180 — Release Blocker Triage and Fix Plan

**Mode:** PLAN

## Objective
Convert audit evidence into the smallest safe plan that reaches a release candidate within the owner's deadline.

## Inputs
Prompts 100–170 outputs, verified documentation, defect register, dependency classification and Play readiness gate.

## Required triage
For every issue classify P0–P3 using `08_RELEASE_DEADLINE_AND_SCOPE_GUARD.md`.

## Build the release plan
Create ordered implementation slices. Each slice must include:
- user/release problem;
- exact verified area/files likely affected;
- dependency on other slices;
- migrations/rollback requirement;
- dependency/native change requirement;
- documentation delta;
- tests/edge cases;
- rollback/feature-flag strategy;
- release risk;
- acceptance gate.

## Planning rules
- Prefer fixes that remove P0/P1 blockers first.
- Group tightly coupled fixes only; do not create a mega-refactor.
- Keep broad modernization P3 unless necessary.
- If API 36 adoption requires a risky major stack upgrade, present the short-term/long-term options explicitly rather than silently choosing.
- Treat Play Console account/testing prerequisites as calendar blockers separate from coding.

## Output
- Critical path to release candidate.
- Parallel owner actions (store listing/privacy/testers/account declarations) vs engineering actions.
- Things explicitly deferred.
- Recommended next implementation prompt pack boundaries.

Do not implement fixes in this prompt.
