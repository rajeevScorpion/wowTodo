# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WowTodo** — AI-powered task planner built with Expo (React Native), Supabase backend, and Google OAuth authentication. Users describe tasks via voice or text, and AI (OpenAI/Gemini) breaks them into actionable todo lists with smart grouping, branching, reminders, and task sharing.

## Project Structure

- `context/` — Design docs, implementation guides, and feature context (see [Context Docs](#context-docs))
- `migrations/` — All Supabase SQL migrations, rollbacks, and schema files (see [Migrations](#migrations))
- `app/` — Expo Router file-based routes
- `src/` — Application source code (components, features, services, providers, lib, types)
- `assets/` — Images, icons, fonts

## Development Commands

```bash
npx expo start          # Start dev server (press a/i/w for Android/iOS/Web)
npx expo run:android    # Build and run on Android
npx expo run:ios        # Build and run on iOS
npx expo start --web    # Run web version directly

npm run typecheck       # tsc --noEmit — currently clean, keep it that way
npm run db:reset:local  # supabase db reset — replay all migrations into local
npm run db:push         # apply pending migrations to the cloud project
npm run db:status       # local vs remote migration history, side by side
npm run db:diff:cloud   # prove local and cloud schemas are identical
npm run gen:types       # regenerate src/types/database.ts from the local schema
```

```bash
npm test                # jest — 12 tests over the reminder scheduler
npm run test:watch
```

`npm run typecheck` and `npm test` are the current correctness gates and both pass.
No linter is configured yet.

> A green typecheck is **not** evidence the app launches. Native module problems
> (see `overrides` below) are invisible to `tsc` and jest — they only surface at
> runtime. Confirm with a screenshot or logcat before reporting a build as working.

### Local Supabase

A local stack mirrors the cloud schema. Ports are remapped to **55321–55329**
(the default 54xxx range collides with another Supabase project on the primary
dev machine).

```bash
supabase start          # API 55321 · DB 55322 · Studio 55323
npm run db:reset:local  # apply every migration in dependency order
```

The Android emulator reaches the host at `10.0.2.2`, so `.env` should use
`EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:55321` — not `127.0.0.1`.

### Windows environment

`ANDROID_HOME`, `JAVA_HOME` and the emulator are not on PATH by default on the
current dev machine. Set per-session:

```powershell
$env:JAVA_HOME  = "C:\Program Files\Android\Android Studio\jbr"   # JDK 21
$env:ANDROID_HOME = "D:\AndriodSDK"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
```

## Architecture

### Routing (Expo Router — file-based)

- `app/_layout.tsx` — Root layout; auth state check, redirects to login or app
- `app/(auth)/login.tsx` — Google OAuth login (the only sign-in method)
- `app/(app)/_layout.tsx` — Authenticated app shell with Stack navigator
- `app/(app)/index.tsx` — Home / dashboard
- `app/(app)/tasks.tsx` — Task list with AI creation input
- `app/(app)/task/[id].tsx` — Task detail with todos
- `app/(app)/branch.tsx` — Branch task creation from a todo
- `app/(app)/people.tsx` — People dashboard (shared users)
- `app/(app)/people-detail.tsx` — Individual person's shared tasks
- `app/(app)/shared.tsx` — Shared tasks view
- `app/(app)/notifications.tsx` — In-app notification center
- `app/(app)/profile.tsx` — Edit user profile
- `app/(app)/profile-view.tsx` — View another user's profile
- `app/(app)/settings.tsx` — App settings
- `app/(app)/review.tsx` — Task review screen
- `app/(app)/analytics.tsx` — Analytics dashboard

### Source Code (`src/`)

#### Providers
- `providers/AuthProvider.tsx` — React Context for auth state; Supabase session persistence via AsyncStorage, auto-refresh

#### Features (React Query hooks)
- `features/tasks/api.ts` — Task CRUD hooks (`useTasks`, `useTask`, `useCreateTaskWithTodos`, `useDeleteTask`, `useUpdateTask`, etc.)
- `features/groups/api.ts` — Task group management hooks
- `features/profile/api.ts` — User profile hooks
- `features/reminders/api.ts` — Reminder settings and scheduled reminder hooks
- `features/sharing/api.ts` — Share CRUD, notifications, user search hooks
- `features/sharing/useRealtimeSharing.ts` — Supabase realtime subscription for share updates

#### Services
- `services/ai/` — AI service layer:
  - `prompt.ts` — System prompt for task decomposition (with group suggestions, date/time extraction)
  - `branchPrompt.ts` — Prompt for branch task generation
  - `openai.ts` — OpenAI Chat Completions (gpt-4o-mini)
  - `gemini.ts` — Gemini API fallback (gemini-2.0-flash)
  - `whisper.ts` — OpenAI Whisper (`whisper-1`) audio transcription
  - `proxy.ts` — routes every AI call through the `ai-proxy` Edge Function
  - `index.ts` — Orchestrator: tries OpenAI first, falls back to Gemini **on failure**

**No API keys exist on the client.** All AI calls go through
`supabase/functions/ai-proxy/`, which verifies the user JWT and allow-lists models
(`gpt-4o-mini`, `whisper-1`, `gemini-2.0-flash`). Never reintroduce an
`EXPO_PUBLIC_*_API_KEY` — that prefix is inlined into the shipped bundle.

**Transcription is Whisper only.** Do not add `expo-speech`, `@react-native-voice`,
`SpeechRecognizer` or any on-device recogniser — this is an explicit owner decision
based on accuracy.
- `services/voice.ts` — Audio session wrapper using **expo-audio** (expo-av was deprecated and removed)
- `hooks/useVoiceRecording.ts` — **the single source of truth for voice capture**; `CreateTaskInput` and the branch screen both consume it
- `services/reminders/` — Reminder scheduling and notification system:
  - `scheduler.ts` — Core scheduling logic
  - `settingsCache.ts` — Cache layer for reminder settings
  - `setup.ts` — Notification channel setup

#### Components
- `components/ui/` — Reusable UI primitives (Button, Card, Input, Tabs, Header, Screen, BottomBar, FloatingActionButton, ConfirmDialog, PopoutMenu, ThemeToggle, Divider, EditableChip, GradientHeader, AnimatedPressable, AppText, AppLayout, CactusIcon, GoogleIcon, Heading)
- `components/neo/` — Neumorphic design system (NeoCard, NeoDock, NeoFab, NeoIconButton, NeoInset, NeoPill, NeoScreen)
- `components/sharing/` — Sharing UI (ShareTaskSheet, ShareRow, SharedTaskCard, CollaboratorCard, NotificationRow, RejectionNoteSheet, UserAvatar, ToastNotification)
- `components/TaskCard.tsx` — Task card with progress bar
- `components/TodoItem.tsx` — Todo row with checkbox and delete
- `components/CreateTaskInput.tsx` — Text input + voice recording + AI generation
- `components/VoiceInput.tsx` — Mic button with recording states
- `components/BranchInfoSheet.tsx` — Branch info bottom sheet
- `components/TaskBranchesSheet.tsx` — View all branches of a task
- `components/ReminderSettingsSection.tsx` — Reminder settings UI
- `components/ReminderEditSheet.tsx` — Edit individual reminder
- `components/ReminderSlotRow.tsx` — Single reminder slot display

#### Lib & Types
- `lib/supabase.ts` — Supabase client initialization
- `lib/expoGoDetect.ts` — Expo Go environment detection
- `types/index.ts` — All TypeScript types (Task, Todo, TaskGroup, UserProfile, Share, InAppNotification, ReminderSettings, ScheduledReminder, BranchContext, AIGeneratedTask, etc.)

### Data Model

- **Tasks** — High-level goals from user input. AI generates title, description, event_time. Supports `parent_todo_id` for branching.
- **Todos** — Actionable steps within a task. Supports `due_date`, `due_time`, `is_branched` flag, ordering.
- **Task Groups** — User-defined categories for organizing tasks. AI suggests groups on creation.
- **User Profiles** — Extended user info (name, avatar, DOB, profession, city, bio).
- **Shares** — Task sharing between users with status workflow (pending → accepted/rejected/revoked). Supports `include_branches`.
- **In-App Notifications** — Notification records for share events (received, accepted, rejected).
- **Reminder Settings** — Per-user (or per-group) reminder configuration with 3 slots.
- **Scheduled Reminders** — Individual scheduled reminder instances tied to todos.

### State Management

- **Auth state**: React Context (`AuthProvider`)
- **Server state**: TanStack React Query with cache invalidation via centralized query key factories
- **Realtime**: Supabase Realtime for sharing updates
- **UI state**: Local component state

### Styling

**Tamagui** with a neumorphic ("neo") design system. NativeWind was removed in
commit `55832cd` — there is no `tailwind.config.js`, no `global.css` and no
`nativewind` dependency.

- Theme/token configuration: `src/design-system/tamagui.config.ts`, `themes.ts`, `fonts.ts`
- Semantic colour access: `src/design-system/useSemanticColors.ts`
- Neumorphic primitives: `src/components/neo/`
- Dark/light mode via `userInterfaceStyle: "automatic"` (requires `expo-system-ui`, installed)

When adding a `styled()` variant, avoid `Platform.select()` for the variant
value — it widens literal types and can contribute an empty `default: {}`
branch, which collapses the variant to `undefined` and silently breaks the prop
across the app. Use an explicit ternary instead (see `src/components/ui/Card.tsx`).

### Backend

Supabase PostgreSQL with Row Level Security. All migrations stored in `migrations/` folder. Auth is Google OAuth only; email/password sign-in, sign-up and password reset were removed on 2026-08-18. Uses `SECURITY DEFINER` functions for cross-user profile lookups. Auto-creates profile from OAuth sign-up.

## Context Docs

Documentation and implementation guides are stored in `context/`:

- `context/SHARING_IMPLEMENTATION.md` — Task sharing feature design and implementation details
- `context/BRANCHES_CONTEXT.md` — Branch tasks (sub-tasks from todos) architecture
- `context/EAS_GUIDE.md` — Expo Application Services build and deployment guide
- `context/performance-refactor.md` — Performance optimization notes (optimistic UI, caching, memoization)

## Migrations

All Supabase SQL files are stored in `migrations/`:

- `migrations/supabase_schema.sql` — Base schema (tasks, todos)
- `migrations/supabase_migration_add_task_groups.sql` — Task groups table
- `migrations/supabase_migration_add_user_profiles.sql` — User profiles table
- `migrations/supabase_migration_branches.sql` — Branch task support (parent_todo_id, is_branched)
- `migrations/supabase_migration_sharing.sql` — Shares + notifications tables
- `migrations/supabase_migration_sharing_peek.sql` — Shared task peek RPC
- `migrations/supabase_migration_reminders.sql` — Reminder settings + scheduled reminders
- `migrations/supabase_migration_bugfix_triggers.sql` — Trigger bug fixes
- `migrations/supabase_migration_profiles_email.sql` — Email field on profiles
- `migrations/supabase_migration_get_profiles_by_ids.sql` — Batch profile lookup RPC
- `migrations/supabase_fix_rls_circular.sql` — RLS circular dependency fix
- `migrations/supabase_fix_search_users.sql` — User search function fix
- Corresponding `supabase_rollback_*.sql` files for each migration

## Environment

Requires `.env` with:
```
EXPO_PUBLIC_SUPABASE_URL=<supabase-url>        # http://10.0.2.2:55321 for the emulator
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

AI provider keys are **server-side only**, in `supabase/functions/.env`
(`OPENAI_API_KEY`, `GEMINI_API_KEY`). Full reference:
[docs/engineering/ENVIRONMENT_VARIABLES.md](../docs/engineering/ENVIRONMENT_VARIABLES.md).

## Key Config

- TypeScript strict mode enabled
- Expo new architecture enabled (`newArchEnabled: true`)
- Typed routes enabled (experimental) — route params are type-checked
- Babel includes `react-native-reanimated/plugin` (must be listed last)
- `patch-package` auto-applies metro-config Windows ESM fix via postinstall
- EAS project ID: `cf25c62f-666f-41ff-8fb7-4082e233940e`
- App scheme: `wowtodo`
- Plugins: expo-router, expo-secure-store, **expo-audio**, expo-notifications, @react-native-community/datetimepicker
- `targetSdk` / `minSdk`: **36 / 24** — already meets Google Play's 31 Aug 2026 requirement
- `overrides` pins `expo-asset@~12.0.13` and `expo-constants@~18.0.13`. **Do not remove
  without rebuilding and confirming the app launches** — the skew caused a
  `NoClassDefFoundError: AnyTypeCache` crash after the splash screen

## Working rules

This project is governed by the prompt pack in
[`AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/`](../AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/).
Repository documentation: [`docs/`](../docs/) — start with
[CURRENT_STATE.md](../docs/project/CURRENT_STATE.md) and
[DEFECT_REGISTER.md](../docs/testing/DEFECT_REGISTER.md).

- **This is a working production app, not greenfield.** Preserve working behaviour. Do not
  delete, rewrite or reorganise working code to make it look cleaner.
- **Inspect before concluding.** The repository and verified runtime behaviour are the
  source of truth. Never claim a build or test that was not run.
- **Every schema change** goes in `supabase/migrations/` via `supabase migration new`, and
  needs a paired rollback in `migrations/rollbacks/` plus a row in
  [MIGRATION_REGISTER.md](../docs/data/MIGRATION_REGISTER.md). Regenerate types afterwards
  (`npm run gen:types`).
- **Never put a rollback in `supabase/migrations/`** — the CLI applies every `.sql` file
  there and would run the rollback in the same pass as the migration.
- **A green local reset is not evidence about cloud.** 0013 and 0014 passed locally and
  were absent from production for days, leaving a P0 live. After pushing, confirm with
  `npm run db:diff:cloud` — it must print IDENTICAL.
- **No broad package upgrades** merely because a newer version exists. See
  [DEPENDENCY_REGISTER.md](../docs/engineering/DEPENDENCY_REGISTER.md).
- **Never print or commit secret values.** `.env` and `supabase/.temp/` are gitignored —
  the latter contains the production DB password.
- **Verify RLS in both directions** — that the owner can *and* that a non-owner cannot.
- **Every handoff** needs owner testing steps and rollback/disable steps.
