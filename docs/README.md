# WowTodo Documentation

Durable documentation for the WowTodo monorepo. Established by prompt-pack
`WOWTODO_REVIVAL_V1`, prompt 140, from verified evidence gathered in prompts 100–130.

## Conventions

- **One source of truth per fact.** Documents link rather than copy.
- **Verified facts only.** Anything unconfirmed is marked `UNKNOWN` or `BLOCKED` — never guessed.
- **No secrets, ever.** Variable *names* and purposes only. See [ENVIRONMENT_VARIABLES.md](engineering/ENVIRONMENT_VARIABLES.md).
- **Planned ≠ current.** Future architecture lives in planning documents and must never
  overwrite a current-state document.

## Map

| Area | Document | Purpose |
|---|---|---|
| **Project** | [CURRENT_STATE.md](project/CURRENT_STATE.md) | Where the project stands today — start here |
| | [DECISIONS.md](project/DECISIONS.md) | Decision log with rationale |
| | [CHANGELOG.md](project/CHANGELOG.md) | What changed, when |
| **Product** | [PRODUCT_OVERVIEW.md](product/PRODUCT_OVERVIEW.md) | What WowTodo is and who it serves |
| | [FEATURE_INVENTORY.md](product/FEATURE_INVENTORY.md) | Every feature and its verification status |
| **Architecture** | [SYSTEM_OVERVIEW.md](architecture/SYSTEM_OVERVIEW.md) | Layers, data flow, boundaries |
| | [VOICE_AI_PIPELINE.md](architecture/VOICE_AI_PIPELINE.md) | Voice → transcript → todos, as implemented |
| | [AUTH_AND_SECURITY.md](architecture/AUTH_AND_SECURITY.md) | Auth, RLS, secret placement |
| **Data** | [DATA_MODEL.md](data/DATA_MODEL.md) | Tables, ownership, relationships |
| | [MIGRATION_REGISTER.md](data/MIGRATION_REGISTER.md) | Numbered migration register |
| **Engineering** | [WINDOWS_SETUP.md](engineering/WINDOWS_SETUP.md) | Verified dev-machine setup |
| | [BUILD_AND_RUN.md](engineering/BUILD_AND_RUN.md) | Commands that are known to work |
| | [ENVIRONMENT_VARIABLES.md](engineering/ENVIRONMENT_VARIABLES.md) | Names and purposes, no values |
| | [DEPENDENCY_REGISTER.md](engineering/DEPENDENCY_REGISTER.md) | Versions and upgrade posture |
| **Testing** | [TEST_STRATEGY.md](testing/TEST_STRATEGY.md) | What is tested and how |
| | [REGRESSION_CHECKLIST.md](testing/REGRESSION_CHECKLIST.md) | Manual pre-release pass |
| | [DEFECT_REGISTER.md](testing/DEFECT_REGISTER.md) | Open defects with severity |
| **Release** | [GOOGLE_PLAY_READINESS.md](release/GOOGLE_PLAY_READINESS.md) | Play blockers and status |
| **Audits** | [audits/](audits/) | Full prompt-pack audit reports (deep evidence) |
| | [PROMPT_PACK_EXECUTION_INDEX.md](PROMPT_PACK_EXECUTION_INDEX.md) | Which prompts have run |

## Reading order for a new contributor

1. [PRODUCT_OVERVIEW.md](product/PRODUCT_OVERVIEW.md) — what we're building
2. [CURRENT_STATE.md](project/CURRENT_STATE.md) — where it stands
3. [WINDOWS_SETUP.md](engineering/WINDOWS_SETUP.md) → [BUILD_AND_RUN.md](engineering/BUILD_AND_RUN.md) — get it running
4. [SYSTEM_OVERVIEW.md](architecture/SYSTEM_OVERVIEW.md) — how it fits together
5. [DEFECT_REGISTER.md](testing/DEFECT_REGISTER.md) — what's broken

`app/CLAUDE.md` remains the in-repo agent instruction file for the mobile app and is the
source of truth for app-local coding conventions.
