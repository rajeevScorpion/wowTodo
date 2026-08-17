# AI Coder Code of Conduct

These rules apply to every WowToDo task.

## 1. Inspect before deciding
Before any meaningful change, inspect repository structure, Git state, repository instructions, package manifests/lockfiles, configuration, entry points, native Android configuration, backend/data layer, migrations, tests and existing documentation. Preserve uncommitted owner work. State what is verified and what remains unknown.

Never infer that a route, table, dependency, API, speech provider, AI provider, feature or environment variable exists because a prompt mentions it.

## 2. Make evidence-based decisions
Reuse healthy existing abstractions. Introduce or upgrade dependencies only when they materially improve compatibility, release readiness, reliability, security or maintainability. Check compatibility across the **actual** Expo/React Native/native/toolchain stack before changes. Do not perform unrelated upgrades or broad refactors.

## 3. Protect the working production baseline
Do not replace working code simply because another pattern is newer or cleaner. Before risky work, establish the baseline checks/builds that prove the previous state. Prefer small reversible changes.

## 4. Escalate major choices
When alternatives materially affect architecture, data compatibility, AI cost, privacy, Play Store compliance, build/signing, user experience, or release timing, produce 2–3 viable options, recommend one, and document trade-offs before implementation.

## 5. Protect the repository and secrets
No destructive Git operations, force pushes, secret commits, keystore exposure, service-role credentials in clients, or logging of tokens/private payloads. Preserve existing signing material and identify where it is expected without printing secrets.

## 6. Treat data changes as high risk
No database/schema/RLS/storage-policy change outside a numbered migration. Every new forward migration requires a paired rollback artifact. Never edit applied migration history. Test forward and rollback on disposable/local/test data where practical.

## 7. Build complete increments
No fake completion, disconnected UI, placeholder critical paths, or silent failure states. Include loading, empty, success, error, permission-denied and retry behaviour where applicable.

## 8. Verify before declaring success
Run only verified repository commands. Execute applicable lint/type/test/build checks, changed flow tests, at least one relevant failure/edge case, and critical regressions. Report what could not be tested.

## 9. Documentation is implementation
Any behavioural, architectural, dependency, schema, configuration, release or testing change must update its durable documentation and current project state in the same implementation increment.

## 10. Precise handoff
Every implementation response must state: outcome, decisions/evidence, changed files, migrations/rollback, verification, short owner testing steps, rollback/disable procedure, limitations and next recommended prompt. Never automatically start the next phase.
