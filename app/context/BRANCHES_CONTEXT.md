# Branching Feature — Implementation Context

## Status Overview
| Step | Description | Status |
|------|-------------|--------|
| 0 | Context file + git branch | COMPLETE |
| 1 | Git branch `feat/branches` | COMPLETE |
| 2 | Database migration SQL | COMPLETE |
| 3 | TypeScript types | COMPLETE |
| 4 | Branch AI prompt | COMPLETE |
| 5 | Branch AI functions (openai/gemini/index) | COMPLETE |
| 6 | Branch data hooks (api.ts) | COMPLETE |
| 7 | Register branch screen (_layout.tsx) | COMPLETE |
| 8 | Branch creation screen (branch.tsx) | COMPLETE |
| 9 | Update TodoItem component | COMPLETE |
| 10 | BranchInfoSheet component | COMPLETE |
| 11 | Update task detail screen | COMPLETE |
| 12 | Update task list + delete guard | COMPLETE |

## Key Decisions
- Parent todo completion **always derived** from branch items (checkbox blocked)
- **Recursive branching** allowed (any todo can be branched, including branch task todos)
- Parent task **cannot be deleted** if it has branched todos
- Branch group: **AI decides** (full group picker in confirmation)
- Branch icon on todo → **info popup sheet** (BranchInfoSheet)
- Branch icon on task title → **navigates to mother task**
- Sync via **Postgres triggers** (3 triggers: update, insert, delete)
- Dedicated **branch.tsx** screen with 2-phase flow
- AI context includes **user profile** (profession, city)

## Files Created
| File | Purpose |
|------|---------|
| `BRANCHES_CONTEXT.md` | This implementation tracking file |
| `supabase_migration_branches.sql` | DB migration: parent_todo_id, is_branched, triggers |
| `supabase_rollback_branches.sql` | DB rollback for migration |
| `src/services/ai/branchPrompt.ts` | Branch-specific AI system prompt |
| `app/(app)/branch.tsx` | Branch creation screen (2-phase: input + confirm) |
| `src/components/BranchInfoSheet.tsx` | Bottom sheet showing branch info + actions |

## Files Modified
| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `parent_todo_id` to Task, `is_branched` to Todo, `BranchContext` type, updated Database types |
| `src/services/ai/openai.ts` | Added `generateBranchWithOpenAI()` with branch context message builder |
| `src/services/ai/gemini.ts` | Added `generateBranchWithGemini()` (mirrors OpenAI) |
| `src/services/ai/index.ts` | Added `generateBranch()` orchestrator with fallback |
| `src/features/tasks/api.ts` | Added `useCreateBranch`, `useUnbranch`, `useBranchForTodo`, `useTaskHasBranches`, `branchKeys`; modified `useTasks()` to filter out branches |
| `src/components/TodoItem.tsx` | Added branch icon inline, blocked checkbox for branched todos, dynamic context menu (Branch/View Branch/Unbranch) |
| `app/(app)/task/[id].tsx` | Added branch/unbranch handlers, BranchInfoSheet, GitBranch icon on title for branch tasks, navigate-to-mother |
| `app/(app)/tasks.tsx` | Added delete guard checking for branched todos |
| `app/(app)/_layout.tsx` | Registered `branch` screen |

## Gotchas / Notes
- `ON DELETE RESTRICT` on `parent_todo_id` prevents accidental cascade deletion of parent todos
- Tamagui `backgroundColor` prop doesn't accept concatenated hex strings — use `style` prop instead
- The `Unlink` icon from lucide-react-native is used for "Unbranch" action
- Branch tasks are filtered from main task list via `.is('parent_todo_id', null)` in Supabase query
- Three separate Postgres triggers handle sync: UPDATE of completed, INSERT of new todo, DELETE of todo
- Voice input in branch screen appends transcript to existing additional context (doesn't replace)
- TypeScript check passes with zero errors

## Before Testing
1. Run `supabase_migration_branches.sql` in the Supabase SQL Editor
2. Start the app with `npx expo start`
3. Test the full branch creation flow
4. Verify auto-sync triggers work by completing/uncompleting branch todos
