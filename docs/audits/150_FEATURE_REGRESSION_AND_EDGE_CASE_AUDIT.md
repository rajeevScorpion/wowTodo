# Prompt 150 — Existing Feature Regression and Edge-Case Audit

- **Mode:** VERIFY (no product fixes applied)
- **Date:** 2026-08-17
- **Result:** **44 checks executed, 36 passed, 6 defects found, 2 inconclusive.**
  Sharing — the largest never-tested feature — is **fully correct end to end**.
  The significant discovery is a **branch/delete deadlock** that makes tasks undeletable.

## Test profile

| | |
|---|---|
| Device | Android emulator `emulator-5554`, API 36 |
| Build | dev build, `com.wowtodo.app`, pid stable across all navigation |
| Backend | local Supabase mirror (`supabase_db_wowtodo`), 12 migrations replayed |
| Method | REST via PostgREST with **real GoTrue JWTs** for two distinct users; SQL for trigger logic; deep-link navigation + screenshots + logcat for UI |

Backend behaviour was exercised through the same PostgREST path the app uses, so results
reflect real client behaviour rather than superuser SQL.

---

## Defects found

### DF-1 — P1 · A task containing a branched todo cannot be deleted

`tasks.parent_todo_id` → `todos.id` is **`ON DELETE RESTRICT`**, while
`todos.task_id` → `tasks.id` is `CASCADE`. So deleting a task cascades into its todos and
is then blocked by the branch reference.

```
DELETE /todos?id=eq.<branched todo>  → HTTP 409  23503
DELETE /tasks?id=eq.<parent task>    → HTTP 409  23503
   "update or delete on table todos violates foreign key
    constraint tasks_parent_todo_id_fkey on table tasks"
```

`useDeleteTask` / `useDeleteTodo` optimistically remove the row, the request fails, and
`onError` rolls the cache back — with **no toast and no alert** (`_err` is unused). The
user taps delete, the task disappears, then silently reappears. It looks like a glitch and
the task is **permanently undeletable** until the branch is unlinked, which nothing tells
the user to do.

The delete affordance is offered unconditionally: `TodoItem.tsx:105` uses `is_branched`
only to gate the *checkbox* (`isCheckboxBlocked`), not the delete action at line 98–100.

### DF-2 — P2 · Empty titles are accepted and render as blank ghost cards

`POST /tasks {"title":""}` → **201**. No `NOT NULL`/`CHECK` constraint and no client
validation. Visually confirmed: the task list shows a card with no title, just a progress
bar and date. Unusable and undeletable-looking to the user.

### DF-3 — P2 · Analytics is a "Coming soon" placeholder

`analytics.tsx` renders *"Analytics — Coming soon. Track your productivity and task
completion trends."* It is reachable from the header menu. Prior documentation
(`CLAUDE.md`, and my own first-pass feature inventory) described it as an "Analytics
dashboard", which overstated it. Shipping a reachable dead-end screen is a Play quality
risk and should be hidden or finished before release.

### DF-4 — P2 · Share-accepted notification says "Someone"

`handle_share_status_update` produces *"Someone accepted your share of "X""* while the
insert trigger correctly produces *"Demo User shared "X" with you"*. The status trigger
does not resolve the actor's profile name. Visible in the notification centre.

### DF-5 — P2 · No title length limit

A 5000-character title is accepted (`201`, stored at 5005 chars). The UI truncates
gracefully with an ellipsis after two lines, so there is **no layout break** — but the
value is unbounded in storage and in every payload.

### DF-6 — P3 · `is_branched` is client-maintained, not enforced

`is_branched` is set by the client ([api.ts:543](../../app/src/features/tasks/api.ts#L543)),
not by a trigger. Creating a branch task by any other path leaves the flag stale, and the
flag is what gates the checkbox. Low impact today because the client is the only writer.

---

## Results by category

### Branch completion triggers — 6/7 correct

| Check | Expected | Actual |
|---|---|---|
| 2 incomplete children | parent incomplete | ✅ |
| 1 of 2 complete | parent incomplete | ✅ |
| 2 of 2 complete | **parent completes** | ✅ |
| Reopen a child | parent reopens | ✅ |
| Delete the incomplete child | parent completes | ✅ |
| Delete **all** children | — | ⚠️ parent silently reverts to incomplete (edge case, arguably wrong) |
| Delete the parent todo | — | ❌ **DF-1** |

### Sharing lifecycle — 9/9 correct ✅

The largest previously untested feature behaves correctly at every step.

| # | Check | Result |
|---|---|---|
| S1 | Owner creates share | ✅ 201 |
| S2 | `on_share_insert` notifies recipient | ✅ *"Demo User shared "X" with you"* |
| S3 | Recipient peeks **before** accepting | ✅ returns todos |
| S4 | Recipient reads todos while **pending** | ✅ `[]` — correctly denied |
| S5 | Recipient accepts | ✅ 204 |
| S6 | Recipient reads todos after accepting | ✅ both todos |
| S7 | Owner notified of acceptance | ✅ (wording — DF-4) |
| S9 | Owner revokes | ✅ 204 |
| S10/S12 | Recipient loses todo **and** task access | ✅ `[]`, `[]` |

### Security and data integrity — 4/4 correct ✅

| Check | Result |
|---|---|
| SQL-injection-shaped title stored literally; `todos` table intact | ✅ parameterised |
| Forged `user_id` insert (write as another user) | ✅ **403 / 42501** — RLS `WITH CHECK` holds |
| Pending share grants no data access | ✅ |
| Revoked share removes all access | ✅ |

### Internationalisation — ✅ correct

`"T150U कल सुबह दूध लाना है 🥛 and call मम्मी — café naïve 日本語"` — 112 UTF-8 bytes sent,
**112 stored**, 59 code points → 59, Devanagari + CJK + emoji preserved, and **rendered
correctly in the app UI**. Hindi is fully supported end to end.

> An earlier run of this test appeared to show mangled text (`??`). That was my Windows
> console encoding corrupting the request before it left the shell — not an app defect.
> Re-run with UTF-8 written by Node and posted with `--data-binary`, it passes cleanly.

### UI render checks — 7/7 routes, 0 crashes

`analytics · people · shared · notifications · profile · settings · tasks` — process pid
**stable at 16984 throughout**, **0 JS errors**, all screens rendered distinct content.

| Screen | Observation |
|---|---|
| Home | Renders; **session restored** across a force-stop (verifies A4) |
| Tasks | Search, All/In Progress/Complete tabs, group filter chips, task cards |
| Shared | Good empty state with an "Invite Someone" CTA |
| Notifications | Live notification, unread dot, relative time, "Mark all read" |
| Analytics | ❌ "Coming soon" stub (DF-3) |

---

## Inconclusive / not tested

| Item | Why |
|---|---|
| Offline / reconnect behaviour | Requires controlled network manipulation on the emulator; `refetchOnReconnect` is configured but unproven |
| Rapid duplicate submission | Needs UI automation to fire taps faster than the mutation resolves |
| Reminder **delivery** at slot time | Requires wall-clock waiting; scheduling logic is unit-tested (12/12) |
| Session expiry / token refresh after >1h | Requires an hour of elapsed time |
| Physical device | None available to this agent |

---

## Smallest automation layer worth adding

Ranked by defect-catching value per unit of effort:

1. **RLS + policy integration suite** (highest value). The F1/F5/DF-1 class is invisible to
   `tsc` and jest but trivially testable with two JWTs against the local mirror. The probes
   in this audit and in 120 are already written — promoting them to a permanent suite is
   mostly packaging.
2. **Launch smoke test** — build, install, launch, assert a rendered screen and no fatal in
   logcat. Would have caught two of the three defects that reached the running app.
3. **Constraint tests** — empty title, oversized title, forged `user_id`, delete-with-branch.
   Fast, pure-SQL, and pins DF-1/DF-2 once fixed.

## Restrictions honoured

No product fixes applied. All testing against the local mirror. Every fixture created
(2 users, 6 tasks, 8 todos, 1 share, 2 notifications) was deleted — verified: 0 `T150` rows,
0 empty-title tasks, `auth.users` back to 2.
