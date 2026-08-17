# WowToDo Migration and Rollback Standard

Mandatory for database schema, RLS/policies, storage policies, seed data, database functions/triggers and material persistent configuration changes.

## Permanent numbering
Use a permanent four-digit project number such as `0001`, `0002`, `0003`. Never reuse or renumber a number already applied/shared.

First inspect the repository's existing migration runner and naming convention. If it requires timestamps, keep the timestamp while also embedding the permanent WowToDo migration number.

Preferred forward pattern where timestamps are required:
`<UTC_TIMESTAMP>_<MIGRATION_NUMBER>_<short_description>.sql`

Preferred rollback pattern in a non-auto-applied rollback directory:
`<MIGRATION_NUMBER>_<short_description>.rollback.sql`

Do not change historical migration filenames simply to conform to this standard.

## Mandatory forward header
Every new migration begins with comments containing:

```text
-- WowToDo Forward Migration
-- Migration Number: 0000
-- Migration Identifier: <runner identifier plus permanent number>
-- Title: <short title>
-- Purpose: <why this change exists>
-- Depends On: <migration numbers or none>
-- Affected Objects: <objects>
-- Data Risk: <none/low/medium/high with explanation>
-- Rollback File: <matching rollback path>
-- Pre-Deployment Checks: <checks>
-- Post-Deployment Verification: <verification>
-- Author/Agent: <identifier if available>
-- Created: <ISO date>
```

The actual number must replace `0000` and match filename/register/rollback.

## Mandatory rollback header

```text
-- WowToDo Rollback Migration
-- Rollback Number: 0000
-- Reverts Migration Number: 0000
-- Reverts Migration Identifier: <exact forward identifier>
-- Title: <matching title>
-- Preconditions: <safe rollback conditions>
-- Data Preservation: <backup/archive/restoration approach>
-- Data Loss Risk: <none/low/medium/high with explanation>
-- Forward Migration File: <matching path>
-- Post-Rollback Verification: <verification>
-- Author/Agent: <identifier if available>
-- Created: <ISO date>
```

## Quality rules
- Reverse every object/policy/configuration introduced by the paired migration.
- Do not destroy pre-existing objects or user data.
- For data transforms, preserve the previous representation before destructive transformation.
- If reversal would lose new production data, use an expand/backfill/verify/contract strategy instead of pretending rollback is safe.
- If a truthful safe rollback cannot be designed, stop and redesign/request approval.

## Verification
On a disposable/local/test database when feasible: apply forward -> verify -> rollback -> verify previous state -> reapply forward -> run tests.

## Migration register
Maintain migration number, forward identifier/file, purpose, dependencies, rollback file, forward-test status, rollback-test status, deployment status and documentation link.
