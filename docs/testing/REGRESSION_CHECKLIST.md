# Manual Regression Checklist

Run before any release build. Record date, build, device and result.
Legend: ✅ pass · ❌ fail · ⬜ not yet run.

Status column reflects the **most recent verification (2026-08-17, Android emulator)**.

## Gates

| # | Check | Expected | Status |
|---|---|---|---|
| G1 | `npm run typecheck` | 0 errors | ✅ |
| G2 | `npm test` | 12/12 | ✅ |
| G3 | `npx expo-doctor` | 18/18 | ❌ 17/18 (D3) |
| G4 | `npm run db:reset:local` | 12 migrations apply | ✅ |

## Auth

| # | Check | Expected | Status |
|---|---|---|---|
| A1 | Google OAuth sign-in | reaches home | ✅ |
| A2 | Email/password sign-in | reaches home | ✅ |
| A3 | Password reset email | link opens app | ⬜ |
| A4 | Session survives app restart | still signed in | ⬜ |
| A5 | Token refresh after >1h background | no forced re-login | ⬜ |
| A6 | **Sign out, sign in as user B** | **B sees none of A's data** | ❌ **F2** |
| A7 | **After sign-out, A's reminders stop firing** | no notifications | ❌ **F2** |
| A8 | Account deletion | removes account + data | ❌ **D1 not implemented** |

## Core loop

| # | Check | Expected | Status |
|---|---|---|---|
| C1 | Typed input → AI todos | task + ordered todos | ✅ (7 todos) |
| C2 | Voice → transcript → todos | same | ✅ owner-confirmed |
| C3 | Review screen edit before save | edits persist | ⬜ |
| C4 | Recording auto-stops at 10 min | alert + processing | ⬜ |
| C5 | Deny mic permission | clear message, no crash | ⬜ |
| C6 | Airplane mode during AI call | clear error, no hang | ⬜ **F4 — expect hang** |
| C7 | Background the app mid-recording | no crash, session released | ⬜ |
| C8 | Complete / delete / reorder todos | persists | ⬜ |

## Reminders

| # | Check | Expected | Status |
|---|---|---|---|
| R1 | Notification permission prompt | granted | ✅ |
| R2 | Reminder fires at slot time | notification appears | ⬜ |
| R3 | >60 pending reminders | 60 earliest scheduled | ✅ unit-tested only |
| R4 | Reminder survives device reboot | still fires | ⬜ |
| R5 | Completing a todo cancels its reminders | none fire | ⬜ |
| R6 | Changing slot times reschedules | old cancelled, new set | ⬜ |

## Sharing — all unverified

| # | Check | Expected | Status |
|---|---|---|---|
| S1 | Search user by email | match found | ⬜ |
| S2 | **Search `"@"`** | **only relevant results** | ❌ **F5 — returns all users' emails** |
| S3 | Send share → recipient notified | realtime notification | ⬜ |
| S4 | Peek before accepting | todos visible, task not joined | ⬜ |
| S5 | Accept / reject / revoke | status updates both sides | ⬜ |
| S6 | Recipient toggles completion | syncs to owner | ⬜ |
| S7 | **Recipient edits todo title** | **denied** | ❌ **F1 — allowed** |
| S8 | **Recipient reassigns `user_id`** | **denied** | ❌ **F1 — owner loses todo** |

## Other screens — all unverified

| # | Check | Status |
|---|---|---|
| O1 | Branch a todo → sub-task; parent completion syncs | ⬜ |
| O2 | Task groups create/rename/delete | ⬜ |
| O3 | Analytics dashboard | ⬜ |
| O4 | People / people-detail | ⬜ |
| O5 | Profile edit + view another profile | ⬜ |
| O6 | Notification centre | ⬜ |
| O7 | Light / dark / system theme | ✅ |

## Platform

| # | Check | Status |
|---|---|---|
| P1 | **Physical Android device** | ⬜ **never tested** |
| P2 | Android 13+ notification permission | ✅ emulator |
| P3 | Release (non-debug) build | ⬜ |
| P4 | iOS | ⬜ never built |
| P5 | Offline → reconnect refetch | ⬜ |
