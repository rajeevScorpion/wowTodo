# Recommended WowToDo Repository Documentation Structure

Adapt to the repository rather than duplicating existing docs.

```text
docs/
  README.md
  project/
    CURRENT_STATE.md
    DECISIONS.md
    CHANGELOG.md
    RELEASE_SCOPE.md
  product/
    PRODUCT_OVERVIEW.md
    FEATURE_INVENTORY.md
    USER_FLOWS.md
  architecture/
    SYSTEM_OVERVIEW.md
    REPOSITORY_MAP.md
    AUTH_AND_SECURITY.md
    INTEGRATIONS.md
    VOICE_AI_PIPELINE.md
  data/
    DATA_MODEL.md
    DATA_DICTIONARY.md
    RLS_AND_PERMISSIONS.md
    MIGRATION_REGISTER.md
  engineering/
    WINDOWS_SETUP.md
    BUILD_AND_RUN.md
    DEPENDENCY_REGISTER.md
    ENVIRONMENT_VARIABLES.md   # names/purpose only, never values
  testing/
    TEST_STRATEGY.md
    DEVICE_MATRIX.md
    REGRESSION_CHECKLIST.md
    DEFECT_REGISTER.md
    VOICE_EVALUATION_BASELINE.md
  release/
    GOOGLE_PLAY_READINESS.md
    RELEASE_RUNBOOK.md
    PRIVACY_DATA_SAFETY_MAP.md
    RELEASE_NOTES.md
  features/
    <one durable document per material feature>
```

## Rules
- Reuse existing locations when good equivalents already exist.
- One source of truth per fact; link instead of copy.
- Never put secrets in docs.
- Planned future architecture must not overwrite the current-state architecture document.
