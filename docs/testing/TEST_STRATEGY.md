# Test Strategy

**Honest assessment:** automated coverage is thin and did not catch any of the three
defects found by actually running the app. Manual verification is currently the primary
gate; this document exists to change that.

## Current automated coverage

| Layer | Tool | Coverage | Status |
|---|---|---|---|
| Types | `tsc --noEmit` | whole app | ✅ 0 errors |
| Unit | jest + jest-expo | reminder scheduler only | ✅ 12/12 |
| Config | `expo-doctor` | 18 checks | 16/18 — `expo-asset` peer dep + upstream patch drift |
| Migrations | `db:reset:local` | forward replay of all 13 | ✅ |
| Authorisation | `npm run verify:rls` | share-recipient scope + user search, both directions | ✅ 17/17 |
| Integration | — | none beyond the above | ❌ |
| Component | — | none | ❌ |
| E2E | — | none | ❌ |
| Rollback | manual | 1 of 10 executed (0013, full loop) | ⚠️ |

## What the existing tests actually cover

[`scheduler.test.ts`](../../app/src/services/reminders/__tests__/scheduler.test.ts) — 12
tests over `buildReminderCandidates`, including a 100-todo / 300-candidate scaling test
asserting the first 60 selected are the 60 earliest. This is the right shape: a pure,
exported function with the scheduling policy isolated from the OS API.

## The gap that matters

Three real defects reached the running app and were caught **only by the owner using it**:

| Defect | Why automation missed it |
|---|---|
| `expo-asset` version skew → native crash after splash | Native module resolution — invisible to `tsc` and jest |
| Recorder used after release → render error | Unmount lifecycle — needs a mounted component |
| `42501` after schema reset | Grants, not types or logic |

**Conclusion:** typecheck + unit tests cannot detect launch failures. The single highest-value
addition is a **smoke test that asserts the app reaches a rendered screen** — it would have
caught two of the three.

## Priorities

1. **Smoke test** — build, install, launch, assert a rendered screen and no fatal in logcat.
2. ~~**RLS integration tests**~~ — ✅ **done**: `npm run verify:rls`, 17 checks with two real
   users through PostgREST. Extend it whenever a policy changes.
3. **Rollback verification** — done once for `0013`; the 9 historical rollbacks remain
   unexecuted. Untested rollbacks are assumptions, not safety nets.
4. **Voice evaluation baseline** — prompt 160.
5. **Component tests** for the review screen and reminder UI.

## Running

```bash
cd app
npm run typecheck
npm test
npm test -- --watch
npx expo-doctor
```

## Rules

- Never claim a test or build that was not run.
- A green typecheck is **not** evidence the app launches. Screenshot or logcat evidence is
  required before reporting a build as working — this was the source of a false "zero
  crashes" report.
- Verify RLS in **both** directions: the owner *can* and the non-owner *cannot*.
