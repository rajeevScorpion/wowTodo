# Task Sharing Feature — Implementation Tracker

> **Live context document.** Updated after each phase/commit. Tracks progress, decisions, and issues.

## Status: Phase 4 — Complete (All phases implemented)

---

## Decisions Log

| # | Decision | Choice |
|---|----------|--------|
| 1 | Avatars | OAuth avatar_url in user_profiles + initials fallback |
| 2 | User search | ILIKE on name or email via SECURITY DEFINER RPC |
| 3 | Branch sharing | Task-only default, branches optionally included |
| 4 | Share model | Linked/shared access — single source of truth |
| 5 | Recipient permissions | Toggle completion + add todos only |
| 6 | Navigation | BottomBar slot 4 → Shared Page; slot 5 → People |
| 7 | N_user invite | Simple text share, email-matched on signup |
| 8 | Multi-share | One task → many recipients |
| 9 | "Due" meaning | Incomplete (not date-based) |
| 10 | Rejection notes | Visible to both parties |
| 11 | Notifications | Toast + history page (Header bell) |
| 12 | Realtime | DB enabled Phase 1, subscription code Phase 4 |

---

## Phase 1: Database & API Foundation ✓
**Branch:** `feat-1-db-schema` (from `neoGui`)

### Tasks
- [x] Create `supabase_migration_sharing.sql` (commit: 0bbd84c)
  - [x] Add `avatar_url` to `user_profiles`
  - [x] Create `shares` table with RLS
  - [x] Create `in_app_notifications` table with RLS
  - [x] Replace `tasks` RLS for cross-user SELECT
  - [x] Replace `todos` RLS for recipient toggle + add
  - [x] Create `search_users` RPC
  - [x] Create notification triggers (share insert + status update)
  - [x] Enable Supabase Realtime on tables
- [x] Create `supabase_rollback_sharing.sql` (commit: 0bbd84c)
- [x] Update TypeScript types (`src/types/index.ts`) (commit: cfbeb7e)
- [x] Fix `useTasks` to filter by owner (`src/features/tasks/api.ts`) (commit: cfbeb7e)

---

## Phase 2: Sharing UI & Shared Page ✓
**Branch:** `feat-2-sharing-shared-page` (from `feat-1-db-schema`)

### Tasks
- [x] Create `src/features/sharing/api.ts` (all sharing React Query hooks)
- [x] Add `useSyncAvatarUrl` to `src/features/profile/api.ts`
- [x] Create `src/components/sharing/UserAvatar.tsx`
- [x] Create `src/components/sharing/ShareTaskSheet.tsx`
- [x] Create `src/components/sharing/SharedTaskCard.tsx`
- [x] Create `src/components/sharing/ShareRow.tsx`
- [x] Create `src/components/sharing/RejectionNoteSheet.tsx`
- [x] Create `app/(app)/shared.tsx`
- [x] Enable BottomBar slot 4 (`src/components/ui/BottomBar.tsx`)
- [x] Enable TaskCard Share button (`src/components/TaskCard.tsx`)
- [x] Wire ShareTaskSheet in `app/(app)/tasks.tsx`
- [x] Add `shared` screen to `app/(app)/_layout.tsx`
- [x] Gate edit/delete in `app/(app)/task/[id].tsx` for shared tasks

---

## Phase 3: People Dashboard & Notifications ✓
**Branch:** `feat-3-people-dashboard` (from `feat-2-sharing-shared-page`)

### Tasks
- [x] Create `src/components/sharing/CollaboratorCard.tsx` (commit: d992144)
- [x] Replace `app/(app)/people.tsx` with full dashboard (commit: d992144)
- [x] Create `app/(app)/people-detail.tsx` (commit: d992144)
- [x] Create `src/components/sharing/NotificationRow.tsx` (commit: d992144)
- [x] Create `app/(app)/notifications.tsx` (commit: 1591ff2)
- [x] Enable Header bell + badge (`src/components/ui/Header.tsx`) (commit: 1591ff2)
- [x] Create `src/contexts/ToastContext.tsx` (commit: 69a19e2)
- [x] Create `src/components/sharing/ToastNotification.tsx` (commit: 69a19e2)
- [x] Wire ToastProvider in `app/_layout.tsx` (commit: 69a19e2)
- [x] Mount ToastNotification in `src/components/ui/AppLayout.tsx` (commit: 69a19e2)

---

## Phase 4: Realtime Subscriptions ✓
**Branch:** `feat-4-notifications-realtime` (from `feat-3-people-dashboard`)

### Tasks
- [x] Create `src/features/sharing/useRealtimeSharing.ts` (commit: 9a0ea3f)
- [x] Mount in `src/components/ui/AppLayout.tsx` (commit: 9a0ea3f)
- [x] Wire toast calls to channel events (commit: 9a0ea3f)
- [ ] End-to-end verification (requires running migration + testing with 2 accounts)

---

## Issues Log

| # | Phase | Issue | Resolution | Status |
|---|-------|-------|------------|--------|
| 1 | 1 | profile.tsx missing avatar_url in profileData | Added `avatar_url: profile?.avatar_url ?? null` | Resolved |
| 2 | 1 | Branch created from neoGui not main | Feature branches chain from neoGui (active dev branch) | Resolved |
| 3 | 1 | Circular RLS: tasks policy refs todos, todos policy refs tasks → query fails | Replaced inline subqueries with `SECURITY DEFINER` helper functions (`is_task_shared_with`, `is_branch_visible_to`) | Resolved |

---

## Files Created

| File | Phase | Status |
|------|-------|--------|
| `supabase_migration_sharing.sql` | 1 | Done |
| `supabase_rollback_sharing.sql` | 1 | Done |
| `supabase_fix_rls_circular.sql` | 1-fix | Done |
| `src/features/sharing/api.ts` | 2 | Done |
| `src/components/sharing/UserAvatar.tsx` | 2 | Done |
| `src/components/sharing/ShareTaskSheet.tsx` | 2 | Done |
| `src/components/sharing/SharedTaskCard.tsx` | 2 | Done |
| `src/components/sharing/ShareRow.tsx` | 2 | Done |
| `src/components/sharing/RejectionNoteSheet.tsx` | 2 | Done |
| `app/(app)/shared.tsx` | 2 | Done |
| `src/components/sharing/CollaboratorCard.tsx` | 3 | Done |
| `src/components/sharing/NotificationRow.tsx` | 3 | Done |
| `src/components/sharing/ToastNotification.tsx` | 3 | Done |
| `src/contexts/ToastContext.tsx` | 3 | Done |
| `app/(app)/people-detail.tsx` | 3 | Done |
| `app/(app)/notifications.tsx` | 3 | Done |
| `src/features/sharing/useRealtimeSharing.ts` | 4 | Done |

## Files Modified

| File | Phase | Change | Status |
|------|-------|--------|--------|
| `src/types/index.ts` | 1 | Add Share, notification types, avatar_url | Done |
| `src/features/tasks/api.ts` | 1 | Add `.eq('user_id')` to useTasks | Done |
| `src/features/profile/api.ts` | 2 | Add useSyncAvatarUrl | Done |
| `src/components/ui/BottomBar.tsx` | 2 | Enable slot 4 | Done |
| `src/components/TaskCard.tsx` | 2 | Enable Share + onShareTask | Done |
| `app/(app)/tasks.tsx` | 2 | Wire ShareTaskSheet | Done |
| `app/(app)/_layout.tsx` | 2,3 | Add new screens | Done |
| `app/(app)/task/[id].tsx` | 2 | Permission gating | Done |
| `src/components/ui/Header.tsx` | 3 | Enable bell + badge | Done |
| `app/(app)/people.tsx` | 3 | Replace placeholder | Done |
| `src/components/ui/AppLayout.tsx` | 3,4 | Toast + realtime | Done |
| `app/_layout.tsx` | 3 | ToastProvider wrapper | Done |

---

## Verification Checklist

### Phase 1
- [ ] Run `supabase_migration_sharing.sql` in Supabase SQL editor
- [ ] Verify tables created (shares, in_app_notifications)
- [ ] Test `search_users` RPC
- [ ] Verify RLS: recipient can SELECT shared task/todos but not others' data

### Phase 2
- [ ] Share a task via TaskCard menu → verify share row created
- [ ] Shared Page "Shared" tab shows sent share
- [ ] Recipient "For Me" tab shows pending share
- [ ] Accept → task appears, can toggle todos and add new ones
- [ ] Decline with note → both parties see the rejection note
- [ ] Main tasks list does NOT show shared tasks

### Phase 3
- [ ] People tab shows collaborators with progress metrics
- [ ] Tap collaborator → detail screen with shared tasks
- [ ] Notifications page shows share events
- [ ] Header bell shows unread count badge

### Phase 4
- [ ] Share a task → recipient sees toast immediately
- [ ] Recipient checks a todo → sharer's progress updates live
- [ ] Accept/reject → sharer sees toast notification
- [ ] Notifications page updates without refresh
