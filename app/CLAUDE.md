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
```

No test runner or linter is currently configured.

## Architecture

### Routing (Expo Router — file-based)

- `app/_layout.tsx` — Root layout; auth state check, redirects to login or app
- `app/(auth)/login.tsx` — Google OAuth + email/password login
- `app/(auth)/forgot-password.tsx` — Password reset flow
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
  - `whisper.ts` — OpenAI Whisper audio transcription
  - `index.ts` — Orchestrator: tries OpenAI first, falls back to Gemini
- `services/voice.ts` — Audio recording wrapper using expo-av
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

NativeWind (Tailwind CSS for React Native) with neumorphic ("neo") design system. Global directives in `global.css`, config in `tailwind.config.js`. Use `cn()` from `src/lib/utils.ts` for conditional class merging. Use `StyleSheet` (not NativeWind) for dynamic styles like progress bar widths to avoid css-interop transition crashes. Supports dark/light mode via `userInterfaceStyle: "automatic"`.

### Backend

Supabase PostgreSQL with Row Level Security. All migrations stored in `migrations/` folder. Auth supports Google OAuth via `expo-auth-session` and email/password. Uses `SECURITY DEFINER` functions for cross-user profile lookups. Auto-creates profile from OAuth sign-up.

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
EXPO_PUBLIC_SUPABASE_URL=<supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
EXPO_PUBLIC_OPENAI_API_KEY=<openai-api-key>
EXPO_PUBLIC_GEMINI_API_KEY=<gemini-api-key>
```

At least one AI key (OpenAI or Gemini) is required. OpenAI key is also needed for voice transcription (Whisper).

## Key Config

- TypeScript strict mode enabled
- Expo new architecture enabled (`newArchEnabled: true`)
- Typed routes enabled (experimental) — route params are type-checked
- Babel includes `react-native-reanimated/plugin` (must be listed last)
- `patch-package` auto-applies metro-config Windows ESM fix via postinstall
- EAS project ID: `cf25c62f-666f-41ff-8fb7-4082e233940e`
- App scheme: `wowtodo`
- Plugins: expo-router, expo-secure-store, expo-av, expo-notifications, @react-native-community/datetimepicker
