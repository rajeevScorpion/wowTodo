# WowToDo Master Context

This file is mandatory context for every WowToDo AI-coder task in this programme.

## Verified-by-owner starting context

- WowToDo already has a **working production build**.
- The codebase was developed earlier on another Windows system and has now been cloned onto a different Windows system.
- The new system already has a functioning Android development environment (Android SDK, Gradle, Android emulator and related tooling) being used successfully by another ongoing Android project.
- The objective is to make WowToDo development on this machine similarly reliable and repeatable.
- The immediate target is to prepare the app for Google Play publication and enable a small number of missing/release-critical features before release.
- Existing working behaviour is an asset to preserve, not a reason to rewrite.

## Product direction to verify against code

WowToDo is intended as a voice-first AI-assisted todo/productivity application. The core product idea is that a user can speak naturally and receive useful structured todo items rather than manually typing and decomposing every task.

Past product direction includes natural-language voice capture and task/todo creation. The repository must be inspected to establish exactly what is implemented today. Do not mark any remembered or intended capability as implemented until verified.

## Current improvement direction

The key product improvement under consideration is not merely better transcription. It is better **intent understanding and task planning** between voice input and final todo items.

The desired future pipeline should be evaluated along these conceptual stages, adapted to verified architecture:

`voice/audio -> transcription -> language/intent understanding -> entity/context extraction -> task decomposition/planning -> structured todo objects -> validation/confidence -> user review/confirmation -> persistence`

Potential structures to reason about include action, owner/assignee, timing, priority, dependencies, references, grouping and ambiguity. These are design dimensions, not permission to add fields or schema before inspection.

## Delivery principle

Move quickly through small, complete and reversible increments. Deadline pressure must not cause uncontrolled framework upgrades, destructive schema changes, secret leakage, skipped testing, or undocumented behaviour.

## Source of truth

Repository code, lockfiles, native configuration, migrations, environment-variable names, tests, build profiles, verified runtime behaviour and approved project documentation are the implementation source of truth.

If this context conflicts with the verified repository, report the conflict and recommend the safest resolution before changing behaviour.
