# WowToDo Revival, Readiness & Release Prompt Pack v1

This pack is for an existing WowToDo production codebase that already works and has been cloned onto a new Windows development machine. It is **not** permission to rebuild the application, modernise everything, or replace working architecture.

The immediate objective is to establish an evidence-based, documented, reproducible development baseline so WowToDo can safely receive a small number of release-critical improvements and proceed toward Google Play publication.

## Core operating principle

**Inspect first. Verify before assuming. Preserve working behaviour. Document continuously. Change only what evidence justifies.**

The repository, its working production behaviour, migrations, configuration, tests, and verified documentation are the implementation source of truth.

## Recommended pack location

Extract/copy this entire folder into the WowToDo repository at:

`<WOWTODO_REPO_ROOT>\AI_CODER_PROMPTS\WOWTODO_REVIVAL_V1\`

The prompts assume that relative location, but the AI coder may use the real absolute path if you place it elsewhere.

## Execution order

Read **all files in `00_COMMON` before every numbered prompt**. Then execute numbered prompts in order:

1. `100_REPOSITORY_AND_PRODUCT_RECONSTRUCTION_AUDIT.md`
2. `110_WINDOWS_ENVIRONMENT_AND_REPRODUCIBLE_ANDROID_BUILD.md`
3. `120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md`
4. `130_DEPENDENCY_NATIVE_AND_UPGRADE_ASSESSMENT.md`
5. `140_DOCUMENTATION_SCAFFOLD_AND_VERIFIED_BASELINE.md`
6. `150_EXISTING_FEATURE_REGRESSION_AND_EDGE_CASE_AUDIT.md`
7. `160_VOICE_TO_TODO_PIPELINE_AUDIT_AND_EVALUATION_BASELINE.md`
8. `170_GOOGLE_PLAY_RELEASE_READINESS_AUDIT.md`
9. `180_RELEASE_BLOCKER_TRIAGE_AND_FIX_PLAN.md`
10. `190_REVIVAL_READINESS_GATE.md`

Only after the readiness gate is understood should the planning prompts be used:

11. `200_MISSING_FEATURE_BACKLOG_AND_RELEASE_SLICE_PLAN.md`
12. `210_AGENTIC_VOICE_INTENT_SYSTEM_DESIGN_PLAN.md`
13. `220_POST_RELEASE_TECH_DEBT_AND_ROADMAP_PLAN.md`

## Execution modes

- `AUDIT`: inspect/report only. Do not modify product code, dependencies, database, remote resources or production configuration.
- `VERIFY`: run verified checks/builds/tests; only make harmless local generated changes and restore unintended diffs.
- `IMPLEMENT-DOCS`: create/update documentation only, based on verified facts.
- `PLAN`: produce an evidence-backed plan. Do not implement product changes.

This pack deliberately does **not** implement the missing features. It establishes the safe baseline and produces the evidence required for the next implementation pack.

## Documentation is mandatory

Documentation is not a final handover activity. Every subsequent implementation must update the documentation it changes in the same change/commit. A feature is not done if code and documentation disagree.

## Deadline awareness

The owner is targeting Google Play readiness by the end of the current week. This is a prioritisation constraint, not permission to bypass testing, privacy, signing, migration safety, or store policy requirements.
