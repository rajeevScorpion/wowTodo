# Prompt 100 — Repository and Product Reconstruction Audit

**Mode:** AUDIT

## Objective
Establish exactly what WowToDo is today from repository evidence, without changing product code, dependencies, database schema, remote resources, signing, or environment values.

## Required inspection
1. Repository boundaries, monorepo/workspace structure and dead/legacy-looking areas (do not delete).
2. Git status, branch, remotes and recent relevant history.
3. Package manifests, lockfiles, Node/package-manager expectations and scripts.
4. Expo/React Native/native Android presence and versions as declared in repo.
5. Navigation/routes/screens and main user flows.
6. Auth/session lifecycle.
7. Todo/task domain: entities/types, creation/edit/completion/delete, assignment/sharing/collaboration if present.
8. Voice input: capture library, permission flow, audio lifecycle, transcription path/provider, error handling.
9. AI layer: provider(s), model/config location, prompt(s), server/client placement, structured response contract, validation and persistence.
10. Backend: Supabase or other services, data access, migrations, RLS/auth policies, functions, realtime/storage if present.
11. Notifications/background work/deep links if present.
12. Analytics/crash reporting/logging if present.
13. Build profiles, app identifiers, versioning and release configuration.
14. Existing tests and documentation.
15. Environment-variable **names and purpose only**; never print values.

## Product reconstruction output
Create an evidence-backed report containing:
- repository map;
- verified stack table;
- screen/route inventory;
- verified feature inventory with `VERIFIED-IMPLEMENTED / PARTIAL / PLANNED-ONLY / UNKNOWN`;
- end-to-end voice-to-todo flow as currently implemented;
- backend/data/security summary;
- build/release configuration summary;
- reusable healthy abstractions;
- suspected legacy/dead areas clearly marked `NOT YET PROVEN DEAD`;
- existing documentation quality/gaps;
- material unknowns/blockers.

## Evidence standard
For each important conclusion, cite actual file paths/symbols/config entries or observed repository facts. Do not use product memory as proof.

## Restrictions
- No package installation/upgrades.
- No code/config/documentation modifications.
- No remote API mutations.
- No database migrations.
- No reformatting.
- No deletion of apparently dead code.

## Acceptance gate
The owner should be able to understand what the current app actually does and where the important implementation lives.

Finish with a short `Owner verification` section and recommend Prompt 110 only if the repository can be safely inspected further.
