# Prompt 190 — Revival Readiness Gate

**Mode:** VERIFY

## Objective
Determine whether WowToDo has reached a trustworthy baseline from which release-critical feature work can begin.

## Gate items
Rate each `PASS / FAIL / BLOCKED / NOT APPLICABLE` with evidence:
- repository/product behaviour understood;
- current documentation established and truthful;
- Git baseline safe;
- new Windows toolchain understood;
- dependency install reproducible;
- emulator app launch reproducible;
- Android build/AAB path understood and reproducible or exact blocker known;
- architecture/backend/data ownership understood;
- auth/RLS/security risks triaged;
- dependency upgrades classified rather than guessed;
- current feature regression baseline exists;
- core defects ranked;
- voice-to-todo current pipeline documented;
- voice evaluation baseline exists;
- Play Store engineering/account/content blockers identified;
- release critical path exists;
- migration/rollback convention is documented for all future data changes.

## Classification
- **Gate blocker** — do not begin material feature work.
- **Can be fixed inside first implementation slice**.
- **Safe to defer until post-release**.

## Acceptance
Feature implementation planning can proceed when the repository/build/data/security baseline is sufficiently stable and unknowns are bounded.

If it passes, recommend Prompt 200 and Prompt 210 for planning. Do not implement features.
