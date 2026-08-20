# Feature Inventory

**Status as of 2026-08-17 (prompt 140).**

Verification legend:

| Symbol | Meaning |
|---|---|
| ✅ **VERIFIED** | Observed working at runtime by an agent or the owner |
| 🔍 **CODE-ONLY** | Implementation exists and typechecks; never exercised |
| ⚠️ **DEFECT** | Works but has a known open defect |
| ❌ **MISSING** | Expected for release, not implemented |

> Everything marked 🔍 is scheduled for hands-on verification in **prompt 150**. 🔍 means
> *unverified*, not *broken*.

---

## Core

| Feature | Status | Entry point | Notes |
|---|---|---|---|
| Voice capture | ✅ VERIFIED | [useVoiceRecording.ts](../../app/src/hooks/useVoiceRecording.ts) | expo-audio, m4a, 10-min cap |
| Whisper transcription | ✅ VERIFIED | [whisper.ts](../../app/src/services/ai/whisper.ts) | `whisper-1` via `ai-proxy`. **No on-device/Android speech API is used** — deliberate |
| AI task decomposition | ✅ VERIFIED | [ai/index.ts](../../app/src/services/ai/index.ts) | `gpt-4o-mini` JSON mode; Gemini fallback on failure |
| Task creation + persistence | ✅ VERIFIED | [features/tasks/api.ts](../../app/src/features/tasks/api.ts) | 7-todo generation confirmed in DB |
| Task list / detail | ✅ VERIFIED | [tasks.tsx](<../../app/app/(app)/tasks.tsx>), [task/[id].tsx](<../../app/app/(app)/task/[id].tsx>) | |
| Reminders — scheduling | ✅ VERIFIED | [scheduler.ts](../../app/src/services/reminders/scheduler.ts) | 60-item rolling window; 12 unit tests |
| Reminders — delivery | ✅ VERIFIED | [setup.ts](../../app/src/services/reminders/setup.ts) | `POST_NOTIFICATIONS granted=true`; requires a dev/production build, not Expo Go |
| Auth — Google OAuth | ✅ VERIFIED | [login.tsx](<../../app/app/(auth)/login.tsx>) | |
| Auth — email/password | 🗑️ REMOVED 2026-08-18 | — | Google is now the only sign-in method |
| Sign-out | ⚠️ DEFECT | [settings.tsx:38](<../../app/app/(app)/settings.tsx#L38>) | **F2** — no cache/notification cleanup |

## Supplementary

| Feature | Status | Entry point | Notes |
|---|---|---|---|
| Task groups | ✅ VERIFIED | [features/groups/api.ts](../../app/src/features/groups/api.ts) | AI suggests group at creation |
| Branches | ⚠️ DEFECT | [branch.tsx](<../../app/app/(app)/branch.tsx>) | 3 DB triggers sync parent completion; see [BRANCHES_CONTEXT.md](../../app/context/BRANCHES_CONTEXT.md) |
| Sharing — send | ✅ VERIFIED | [features/sharing/api.ts](../../app/src/features/sharing/api.ts) | see [SHARING_IMPLEMENTATION.md](../../app/context/SHARING_IMPLEMENTATION.md) |
| Sharing — accept/reject | ✅ VERIFIED | [shared.tsx](<../../app/app/(app)/shared.tsx>) | status workflow in DB triggers |
| Sharing — peek before accept | ✅ VERIFIED | `peek_shared_task_todos` RPC | |
| Sharing — recipient edits | ⚠️ DEFECT | RLS policy | **F1 (P0)** — recipient can rewrite title and seize `user_id` |
| User search | ⚠️ DEFECT | `search_users` RPC | **F5 (P1)** — discloses all users' emails |
| In-app notifications | ✅ VERIFIED | [notifications.tsx](<../../app/app/(app)/notifications.tsx>) | Realtime-backed; no DELETE policy (**F8**) |
| Realtime sync | 🔍 CODE-ONLY | [useRealtimeSharing.ts](../../app/src/features/sharing/useRealtimeSharing.ts) | 4 channels; `todos`, `shares`, `in_app_notifications` published |
| People directory | 🔍 CODE-ONLY | [people.tsx](<../../app/app/(app)/people.tsx>) | |
| Analytics dashboard | ❌ STUB | [analytics.tsx](<../../app/app/(app)/analytics.tsx>) | **"Coming soon" placeholder — not implemented (DF-3)** |
| Review screen | 🔍 CODE-ONLY | [review.tsx](<../../app/app/(app)/review.tsx>) | Confirms AI output before saving |
| User profiles | ✅ RENDERS | [profile.tsx](<../../app/app/(app)/profile.tsx>) | |
| Theming | ✅ VERIFIED | [design-system/](../../app/src/design-system/) | Neumorphic, light/dark/system |

## Missing for release

| Feature | Status | Why it matters |
|---|---|---|
| Account deletion | ✅ SHIPPED | Settings → Delete account, typed `DELETE` confirmation → `delete-account` Edge Function. Deletes the `auth.users` row; cascade clears all nine tables. Web page at `/delete-account` for the Play Console URL |
| Privacy policy | ❌ MISSING | Required to complete the Play Data Safety form; audio leaves the device to OpenAI |
| Rate limiting on AI | ❌ MISSING | **F3** — billing abuse |
| Request timeouts | ❌ MISSING | **F4** |
| AI observability | ❌ MISSING | No prompt version, latency, cost or fallback-rate telemetry — blocks the prompt-160 evaluation baseline |

## Deliberate non-features

- **On-device / Android speech recognition** — explicitly rejected by the owner in favour
  of Whisper for accuracy. No `SpeechRecognizer`, `expo-speech` or `@react-native-voice`
  exists anywhere in the codebase (verified by search).
- **Offline task creation** — AI decomposition requires a network.
