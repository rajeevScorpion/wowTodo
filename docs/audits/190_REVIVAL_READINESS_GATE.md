# Prompt 190 — Revival Readiness Gate

- **Mode:** VERIFY · checks re-run fresh on 2026-08-17, not cited from earlier runs
- **Commit:** `2dfc932`

# ✅ GATE: **PASS**

**Feature-implementation planning may proceed. Prompts 200 and 210 are recommended.**

The baseline is trustworthy: the app builds and runs, the data model and security posture
are understood and *measured*, defects are ranked with reproductions, and every unknown is
bounded and named. The open defects are **known, documented and triaged** — which is the
gate's actual requirement — not absent.

**One qualification:** this is a gate on the *baseline*, not on release. Six P0 blockers
remain (see [RELEASE_PLAN.md](../project/RELEASE_PLAN.md)), and one of them —
`ai-proxy` not deployed — means the core feature does not work in production today.

---

## Gate items

| # | Item | Rating | Evidence |
|---|---|---|---|
| 1 | Repository/product behaviour understood | **PASS** | 21 routes, 8 tables, 13 functions, 11 triggers mapped; 14/14 screens now render-verified; [FEATURE_INVENTORY](../product/FEATURE_INVENTORY.md) |
| 2 | Documentation established and truthful | **PASS** | 24 documents; every claim traced to a command or observation; unknowns marked `UNKNOWN`/`BLOCKED` rather than guessed |
| 3 | Git baseline safe | **PASS** | Clean tree, linear history, no secrets committed; two credential-exposure incidents caught and blocked |
| 4 | Windows toolchain understood | **PASS** | [WINDOWS_SETUP.md](../engineering/WINDOWS_SETUP.md) incl. the emulator-mic and `adb exec-out`/`MSYS_NO_PATHCONV` pitfalls that caused real false diagnoses |
| 5 | Dependency install reproducible | **PASS** | `npm install` + `patch-package` postinstall; `overrides` documented with the crash they prevent |
| 6 | Emulator app launch reproducible | **PASS** | Re-verified today: force-stop → relaunch → renders, session restored, 0 JS errors across 7 routes |
| 7 | AAB path understood | **PASS w/ known blocker** | `eas.json` production profile → `app-bundle`. **Blocker known and named:** release is debug-signed locally; EAS signing unconfirmed (E5) |
| 8 | Architecture/data ownership understood | **PASS** | [120 audit](120_ARCHITECTURE_BACKEND_DATA_AND_SECURITY_AUDIT.md); single data-access layer confirmed |
| 9 | Auth/RLS/security risks triaged | **PASS** | 8 findings, each *reproduced* with real JWTs, ranked P0–P3, fix directions recorded. F1/F5 open but understood |
| 10 | Dependency upgrades classified | **PASS** | [130 audit](130_DEPENDENCY_NATIVE_AND_UPGRADE_ASSESSMENT.md) — 5 categories, evidence-based, not guessed. 44 advisories proven unreachable by production-bundle scan |
| 11 | Feature regression baseline exists | **PASS** | [150 audit](150_FEATURE_REGRESSION_AND_EDGE_CASE_AUDIT.md) — 44 checks + [REGRESSION_CHECKLIST](../testing/REGRESSION_CHECKLIST.md) |
| 12 | Core defects ranked | **PASS** | [DEFECT_REGISTER](../testing/DEFECT_REGISTER.md) — 1 P0, 8 P1, 9 P2, 4 P3, each with reproduction |
| 13 | Voice pipeline documented | **PASS** | [VOICE_AI_PIPELINE.md](../architecture/VOICE_AI_PIPELINE.md) — all 7 stages |
| 14 | Voice evaluation baseline exists | **PASS** | [VOICE_EVALUATION_BASELINE.md](../testing/VOICE_EVALUATION_BASELINE.md) — 18 utterances, reproducible harness at `scripts/eval-voice-baseline.mjs` |
| 15 | Play blockers identified | **PASS** | [170 audit](170_GOOGLE_PLAY_RELEASE_READINESS_AUDIT.md) — engineering / console / assets separated; live policy re-verified |
| 16 | Release critical path exists | **PASS** | [RELEASE_PLAN.md](../project/RELEASE_PLAN.md) — 9 ordered slices with rollback and acceptance gates |
| 17 | Migration/rollback convention documented | **PASS** | [MIGRATION_REGISTER.md](../data/MIGRATION_REGISTER.md) — 12 grandfathered, next is `0013`, rules stated |

**17 PASS · 0 FAIL · 0 BLOCKED.**

## Verification re-run today

| Check | Result |
|---|---|
| `git status` | clean (bar this prompt's documents) |
| `npm run typecheck` | **0 errors** |
| `npm test` | **12/12** |
| `npx expo-doctor` | **16/18** — see below |
| Emulator launch + 7 routes | alive, 0 JS errors |

### `expo-doctor` moved 17/18 → 16/18 — and it is not a regression

The newly-failing check is *"packages match versions required by installed Expo SDK"*:

```
expo            expected ~54.0.37  found 54.0.36
expo-constants  expected ~18.0.14  found 18.0.13
expo-updates    expected ~29.0.20  found 29.0.19
jest-expo       expected ~54.0.18  found 54.0.17
```

**Nothing in the repository changed between the two runs — Expo published new patch
versions upstream during the day.** This check is a moving target by design.

All four are **patch-level within SDK 54** (low risk, no native regeneration). Not upgraded
here because VERIFY mode forbids it; folded into release-plan Slice 8. Worth recording as a
standing fact: a clean `expo-doctor` is not a stable state, and any future "doctor
regression" should first be checked against upstream publishing before being treated as a
defect.

---

## Classification of what remains

### Gate blockers — **none**

Nothing prevents feature-implementation *planning* from beginning.

### Fix inside the first implementation slice

| Item | Slice |
|---|---|
| F1 — recipient can seize data (**P0**) | 1 |
| F5 — email enumeration (**P0**) | 1 |
| Deploy `ai-proxy` + cloud secrets (**P0**) | 2 |
| Account deletion (**P0**, Play) | 3 |
| F2 — sign-out leaves data on device | 4 |
| F3/F4 — rate limiting, timeouts | 5 |
| VE-1 — wrong weekday dates | 6 |
| DF-1 — branch/delete deadlock | 7 |
| `expo-asset` + patch drift | 8 |

### Safe to defer until post-release

F6 (`search_path`), F7 (untested rollbacks), F8 (notification retention), DF-2…DF-5,
VE-2/VE-3/VE-4 (prompt quality), crash reporting, Expo 54→57, iOS, the Analytics feature.

---

## Bounded unknowns

Every remaining unknown is *named and scoped* — none is open-ended:

| Unknown | Bound |
|---|---|
| Play account type / 12-tester rule | Single owner question; determines timeline only |
| Is recipient editing intended? (O-1) | Single owner decision; changes migration `0013` only |
| Physical-device behaviour | One checklist run |
| Offline mutation queueing | One scoped test |
| iOS | Explicitly out of scope |

---

## Recommendation

**Proceed to Prompt 200 (missing-feature backlog and release slice plan) and Prompt 210
(agentic voice intent design).**

Two conditions carried forward:

1. **Prompt 210 must treat the 160 baseline as its regression gate.** The evaluation set
   exists precisely so the agentic layer can be proven better rather than assumed better —
   and it already identifies the highest-value target: date extraction is **0/9**, entirely
   a prompt-layer defect, fixable without any agentic machinery.
2. **Release work (180) outranks agentic work (210).** The scope guard is explicit that a
   stable production pipeline should not be replaced during release week. The insertion
   point is identified and safe (`generateTask()`), so this costs nothing to sequence
   correctly.

## Standing caution for implementation

Three defects this week — the `expo-asset` crash, the released-recorder render error, and
the `42501` grants failure — **passed typecheck and all 12 tests and still broke the
running app**. They surfaced only when the owner ran it.

Every slice in the release plan therefore requires **runtime evidence**, not a green
typecheck. The highest-value tooling addition remains a launch smoke test that asserts a
rendered screen.
