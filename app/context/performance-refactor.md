# Performance Refactor Log

## 1. Goal

Move the app toward a local-first / optimistic UI architecture so that common interactions (checking todos, navigating screens, adding/deleting items) feel instant, while Supabase sync happens in the background.

## 2. Current Architecture Findings

### State Management
- **Auth**: React Context (`AuthProvider`) — session persisted via Supabase + AsyncStorage
- **Server data**: TanStack React Query v5 — in-memory cache only, no persistence
- **UI state**: Local `useState` in components
- **No additional state libraries** (no zustand, redux, jotai, etc.)

### QueryClient Configuration (before)
```ts
const queryClient = new QueryClient(); // zero config
```
- `staleTime: 0` — every mount/focus triggers refetch
- `gcTime: 5 min` — default
- `refetchOnWindowFocus: true` — aggressive refetch on app foreground
- No cache persistence — cache lost on app restart

### Mutation Patterns (before)
- Only `useReorderTodos` had optimistic updates (full onMutate/onError/onSettled)
- All other mutations used `onSuccess: invalidateQueries` — UI waited for server round-trip + refetch
- `useToggleTodo`: checkbox didn't update until server responded
- Single `isPending` flag disabled ALL checkboxes during any toggle

### Realtime
- Only used for sharing feature (`useRealtimeSharing.ts`)
- No realtime on user's own tasks/todos

### Component Rendering (before)
- `TodoItem`: no `React.memo`
- `TaskCard`: no `React.memo`
- `tasks.tsx`: inline `renderItem` arrow function (new reference every render)
- Full-screen `<ActivityIndicator>` shown on every screen load, even with cached data

## 3. Current Data Flow Mapping

### Loading a todo list (before)
1. Navigate to task detail screen
2. `useTask(id)` and `useTaskTodos(id)` fire in parallel
3. Full-screen spinner shown while both load
4. Data renders after both queries resolve

### Checking a todo (before)
1. User taps checkbox
2. `toggleTodo.mutate({ id, completed })` fires
3. ALL checkboxes disabled (`toggleTodo.isPending`)
4. Supabase updates the row
5. `onSuccess` invalidates `taskKeys.todos(taskId)` and `taskKeys.all`
6. React Query refetches both queries
7. UI finally updates with new state

### Estimated round-trip: 300–800ms visible delay per checkbox tap

## 4. Pain Points Identified

1. **Checkbox lag**: Most-used interaction has the worst latency
2. **Global isPending freeze**: Tapping one checkbox disables all others
3. **Full-screen spinners**: Every screen revisit shows a loading spinner
4. **No cache persistence**: App restart = blank slate, everything refetched
5. **Aggressive refetch**: `staleTime: 0` causes redundant network calls
6. **No memoization**: Every parent re-render re-renders all list items
7. **Inline renderItem**: FlatList renderItem creates new function every render

## 5. Clarifying Questions

- **Scope**: Stage 1 + Stage 2 (optimistic UI + persistence). Stage 3 (realtime tightening) deferred.
- **Doc location**: `performance-refactor.md` in repo root, committed to branch.

## 6. Refactor Strategy

### Stage 1 — Optimistic UI + Config + Memoization (no new packages)

**1A. QueryClient defaults**
- `staleTime: 2 min` — data is fresh for 2 minutes, no refetch on remount
- `refetchOnWindowFocus: false` — prevent aggressive foreground refetch
- `refetchOnReconnect: true` — DO refetch when network returns

**1B. Optimistic updates for 5 mutations**
Applied the proven `onMutate/onError/onSettled` pattern from `useReorderTodos` to:
- `useToggleTodo` — flip completed in both `taskKeys.todos` and `taskKeys.all` caches
- `useDeleteTodo` — remove from both caches
- `useAddTodo` — append optimistic todo with `crypto.randomUUID()` temp id
- `useUpdateTodo` — update title in `taskKeys.todos` cache
- `useDeleteTask` — remove from `taskKeys.all` cache

**1C. Per-todo isPending tracking**
Replaced single `toggleTodo.isPending` with `Set<string>` tracking individual todo IDs. Each checkbox only shows loading for its own toggle.

**1D. React.memo + useCallback**
- `TodoItem`: `React.memo` with custom comparator (ignores callback reference changes)
- `TaskCard`: `React.memo` with custom comparator
- `tasks.tsx`: `renderItem` extracted to `useCallback`, handlers wrapped in `useCallback`

**1E. Stale-while-revalidate loading**
- Replaced full-screen `<ActivityIndicator>` gates with conditional rendering
- `isLoading` (no data at all) → full spinner
- `isFetching && !isLoading` (background refetch) → subtle inline sync indicator

### Stage 2 — Cache Persistence

- Installed `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister`
- Replaced `QueryClientProvider` with `PersistQueryClientProvider`
- Cache persisted to AsyncStorage with 7-day maxAge
- `gcTime` bumped to 7 days to match
- `buster: '1'` for cache-busting on schema changes

## 7. UX Improvement Estimates

| Touch Point | Before | After | Improvement |
|---|---|---|---|
| Toggle checkbox | ~300-800ms delay, ALL checkboxes disabled | Instant flip, only that checkbox loading | Near-instant, no global freeze |
| Delete a todo | Wait for server → refetch → disappears | Instant disappearance, sync in background | Instant |
| Add a todo | Wait for server → refetch → appears | Instant appearance with temp id | Instant |
| Edit todo title | Wait for server → refetch → updated | Already shown, sync in background | No visible delay |
| Navigate to task list | Full spinner on every visit | Cached data shown immediately | No spinner on revisit |
| Navigate to task detail | Full spinner while fetching | Cached todos shown immediately | Instant screen |
| Delete a task | Wait for server → refetch | Instant removal from list | Instant |
| App foreground resume | All queries refetch simultaneously | No refetch (staleTime=2min) | No flicker |
| App cold start | Full spinner, fetch everything | Cached data from AsyncStorage, no spinner | Instant data |

## 8. Implementation Progress Log

- [x] Create `performance` branch
- [x] 1A: Configure QueryClient with sensible defaults
- [x] 1B: Add optimistic updates to 5 mutations
- [x] 1C: Fix per-todo isPending tracking
- [x] 1D: Memoize TodoItem and TaskCard
- [x] 1E: Replace loading gates with stale-while-revalidate
- [x] Stage 2: Install persistence packages, add PersistQueryClientProvider

## 9. Files Changed

| File | Changes |
|---|---|
| `app/_layout.tsx` | QueryClient config (staleTime, gcTime, retry, refetchOnWindowFocus), PersistQueryClientProvider |
| `src/features/tasks/api.ts` | Optimistic updates for 5 mutations (toggle, delete todo, add, update, delete task), added expo-crypto import |
| `app/(app)/task/[id].tsx` | Per-todo isPending Sets, pass taskId to toggleTodo, sync indicator |
| `src/components/TodoItem.tsx` | `React.memo` with custom comparator |
| `src/components/TaskCard.tsx` | `React.memo` with custom comparator |
| `app/(app)/tasks.tsx` | `useCallback` for renderItem/handlers, sync indicator, isFetching |
| `package.json` | Added `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` |

## 10. Risks / Tradeoffs

1. **`useToggleTodo` signature changed** — Now requires `taskId` in variables. Only 1 call site, updated.
2. **Optimistic add uses temp UUID** — Replaced by real id on `onSettled` refetch. Edge case: deleting optimistic todo before server responds fails silently, reconciled by refetch.
3. **Custom React.memo comparators** — Must be updated when props change. Comments added as reminders.
4. **Realtime channel can undo optimistic updates** — The sharing `todosChannel` invalidates on ANY todo change. Stage 3 (deferred) would filter own-user events.
5. **7-day cache persistence** — Stale data could persist if schema changes. `buster` field provides the escape hatch.

## 11. Validation Notes

- TypeScript compilation: All errors are pre-existing (in `sharing/api.ts`, `Card.tsx`, `profile-setup.tsx`). No new errors from our changes.
- Verification checklist:
  1. Toggle checkbox → instant flip, single-checkbox loading
  2. Rapidly toggle multiple → all flip independently
  3. Delete todo → instant disappearance
  4. Add todo → instant appearance
  5. Edit title → persists on blur without delay
  6. Delete task → instant removal from list
  7. Screen navigation → no spinner if recently visited
  8. App restart → cached data shown immediately (Stage 2)
  9. Network failure during toggle → checkbox rolls back
  10. Drag reorder → still works (unchanged)

## 12. Final Architecture Summary

### Previous data flow
```
User action → Supabase mutation → onSuccess: invalidateQueries → refetch → UI updates
```

### New data flow
```
User action → onMutate: optimistic cache update → UI updates instantly
           → Supabase mutation (background)
           → onSettled: invalidate + refetch for server reconciliation
           → onError: rollback to snapshot
```

### Cache lifecycle
```
App start → AsyncStorage hydrates React Query cache → stale data shown instantly
         → background refetch if data is stale (>2 min)
         → cache written back to AsyncStorage (throttled to every 3s)
```

## 13. Future Recommendations

1. **Stage 3: Realtime blast radius** — Filter `todosChannel` in `useRealtimeSharing.ts` to skip own-user events, preventing double-invalidation after optimistic updates.

2. **Network status monitoring** — Add `@react-native-community/netinfo` to detect offline state and show a persistent banner. Could also conditionally suppress mutations when offline and queue them.

3. **Sync status indicators** — Add per-item sync status (pending/synced/failed) for power users who want to know what hasn't synced yet.

4. **MMKV for faster persistence** — AsyncStorage is JSON-serialized and relatively slow. `react-native-mmkv` is 30x faster for read/write. Consider migrating the persister if cold-start time matters.

5. **Conflict resolution** — If multi-device editing becomes common, add `updated_at` comparison and last-write-wins or user-prompt strategy.

6. **Error boundaries** — Add React error boundaries around screens to gracefully handle rendering failures from corrupted cache data.

7. **`useCreateTaskWithTodos` optimization** — Currently not optimistic because it involves an AI call. Could show a skeleton/placeholder card while creating.
