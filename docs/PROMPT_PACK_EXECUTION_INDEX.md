# Prompt Pack Execution Index

Pack: [`WOWTODO_REVIVAL_V1`](../AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/)

| Prompt | Mode | Status | Output |
|---|---|---|---|
| **100** — Repository & product reconstruction audit | AUDIT | ✅ done | blocker B1 raised: repo was the landing site, not the app — resolved by restructure |
| **110** — Windows environment & reproducible Android build | VERIFY | ✅ done | app builds, installs, launches; local Supabase mirror; keys moved server-side; first tests |
| **120** — Architecture, backend, data & security audit | AUDIT | ✅ done | [report](audits/120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md) — 1 P0, 4 P1, 3 P2 |
| **130** — Dependency, native & upgrade assessment | AUDIT | ✅ done | [report](audits/130_DEPENDENCY_NATIVE_AND_UPGRADE_ASSESSMENT.md) — no upgrade required; targetSdk already 36 |
| **140** — Documentation scaffold & verified baseline | IMPLEMENT-DOCS | ✅ done | this `docs/` spine |
| **150** — Existing feature regression & edge-case audit | AUDIT | ⏳ next | will verify the 8 unexercised screens |
| **160** — Voice-to-todo pipeline audit & evaluation baseline | AUDIT | ⬜ | |
| **170** — Google Play release readiness audit | AUDIT | ⬜ | preliminary in [GOOGLE_PLAY_READINESS.md](release/GOOGLE_PLAY_READINESS.md) |
| **180** — Release blocker triage & fix plan | PLAN | ⬜ | will triage the defect register |
| **190** — Revival readiness gate | AUDIT | ⬜ | **the go/no-go decision** |
| **200** — Missing feature backlog & release slice plan | PLAN | 🔒 gated by 190 | |
| **210** — Agentic voice intent system design | PLAN | 🔒 gated by 190 | |
| **220** — Post-release tech debt & roadmap | PLAN | 🔒 gated by 190 | |

## Standing constraints

From `00_COMMON` and the owner, in force for all prompts:

- Existing production app — **not** greenfield. Preserve working behaviour.
- Do not delete, rewrite or reorganise working code to make the project look cleaner.
- No destructive git commands. No secret values printed.
- No remote database migrations or production service changes during an audit.
- **Do not silently fix findings discovered during an audit.**
- No broad package upgrades merely because a newer version exists.
- Every data/schema change needs a numbered forward migration **and** a paired rollback,
  with the number in both file headers.
- Every handoff needs owner testing steps and rollback/disable steps.
- Preserve uncommitted owner changes.
- Repository and verified runtime behaviour are the source of truth when they conflict
  with the pack's assumptions.

## Owner instructions on top of the pack

- Fix findings hereafter if critical; proceed autonomously while checks stay manageable.
- Take the decisions that make it a glitch-free, scalable native app.
- Notifications and reminders must work excellently on native.
- **Whisper for transcription — never Android's built-in recogniser.**
- Permission granted to add packages to fix issues.
- Run 120 → 190 in sequence; stop only for something needing owner help.
  *(This overrides the pack's "do not start the next numbered prompt automatically" rule.)*
