# Mandatory WowToDo Implementation Handoff Template

Use this exact structure after every **IMPLEMENT** task in future packs, and adapt it for documentation-only implementation.

## Outcome
2–3 sentences describing what now works.

## Decisions made
Only meaningful decisions, each tied to verified repository/runtime evidence.

## Changed files
Group logically (mobile/native, backend/Supabase, shared/services, tests, docs, release/config). Describe purpose; do not paste large files.

## Documentation updated
List documents changed and what new source-of-truth fact they now capture.

## Migrations and rollback
For each migration: number, forward filename, rollback filename, forward test, rollback test, data-risk note. If none, explicitly say so.

## Dependencies/configuration
List dependency/version/config changes and why each was necessary. If none, say so.

## Verification completed
List actual commands/tests/builds/devices and outcomes. Never mark an unrun check as passed.

## How to test
Give 3–8 plain-language steps for the owner. State exact screen/action and expected result. Include one relevant failure/edge case and one regression check. Use commands only if verified.

## How to roll back or disable
Give the verified rollback, feature flag, revert or deployment reversal path. Do not invent commands.

## Known limitations
State honestly or `None known within the approved scope`.

## Current release impact
State whether this change reduces, increases or does not affect Google Play release risk, and why.

## Next recommended prompt
Name the next safe prompt. Do not begin it automatically.
