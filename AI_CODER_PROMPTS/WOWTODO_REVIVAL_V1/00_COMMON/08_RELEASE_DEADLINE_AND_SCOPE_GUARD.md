# Release Deadline and Scope Guard

## Owner objective
Prepare WowToDo for Google Play publication by the end of the current week, while leaving the codebase in a stable state for continued development.

## How to use the deadline
Use the deadline to prioritise, not to bypass engineering controls.

Classify findings/features into:
- **P0 — Release blocker:** cannot safely submit/publish or core product is broken.
- **P1 — Must address before release:** serious user/data/privacy/reliability issue with realistic fix scope.
- **P2 — Valuable release improvement:** improves core experience but can be feature-flagged/deferred if risk is high.
- **P3 — Post-release:** tech debt, broad redesign, non-critical refactor, speculative expansion.

## Release-first bias
Prefer the smallest stable release candidate over broad modernization.

Do not perform a major framework/native upgrade during the release week unless the audit proves it is required for build/store compliance or resolves a P0/P1 issue, and the upgrade has an explicit rollback/recovery path.

## Voice intelligence scope
The agentic voice improvement is strategically important, but release timing does not justify replacing a stable production pipeline in one uncontrolled change. First establish an evaluation baseline and architecture plan. Prefer a feature flag/canary/fallback path for material AI changes.
