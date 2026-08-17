# Changelog

Repository-level changes. Not yet a released-product changelog — nothing has shipped to
Google Play. Release notes will start at the first production build.

## Unreleased

### 2026-08-17 — Revival

Repository revived from the retired `goodtodo` project and audited under prompt pack
`WOWTODO_REVIVAL_V1`.

#### Structure
- Restructured into `app/` (product) and `web/` (marketing site); 30 tracked files moved
  with `git mv` to preserve rename history.
- Imported the mobile app from `goodtodo@master` files-only — 136 files, `.env` excluded.
- Root `README.md` and this `docs/` spine created.

#### Fixed
- **Android notifications were silently dead on Android 13+** — `POST_NOTIFICATIONS` was
  never declared. Added with `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`.
- **Reminders exceeded the OS pending-notification cap** and were discarded without error.
  Replaced with a 60-item rolling window plus throttled foreground top-up and batched writes.
- **24 TypeScript errors → 0.** Root cause: an untyped Supabase client and a hand-written
  `Database` type that had drifted from the schema.
- **Crash after splash** — `NoClassDefFoundError: AnyTypeCache`, caused by `expo-audio@1.1.1`
  requiring `expo-asset@~57` against SDK 54's `~12`. Fixed with npm `overrides`.
- **"Cannot use shared object that was already released"** — unmount cleanup read
  `recorder.isRecording` after `useAudioRecorder` had released the native object.
- **`42501 permission denied` after local DB reset** — `drop schema public cascade`
  destroys Supabase's DEFAULT PRIVILEGES; the reset script now restores them.
- `Card.tsx` `Platform.select()` variant collapsing to `undefined` and breaking `elevated`
  across the app.

#### Security
- **AI keys moved server-side** into the `ai-proxy` Edge Function. Verified: a production
  bundle contains 0 provider secrets.
- **Blocked a credential leak** — `supabase/.temp/pooler-url`, containing the production
  database password, was one `git add` from a public repository. Removed and gitignored.

#### Changed
- Migrated from deprecated `expo-av` to `expo-audio`; consolidated two duplicated recording
  implementations into `useVoiceRecording`.
- Replaced the hand-written `Database` type with generated types (`npm run gen:types`).

#### Added
- Local Supabase mirror (ports 55321–55329) and `npm run db:reset:local`.
- First test suite — 12 tests over the reminder scheduler.
- `npm run typecheck`, `gen:types`, `test`, `test:watch`.
- `migrations/MIGRATION_ORDER.md` — authoritative apply order derived from git history.
- Audit reports [100](../audits/), 120, 130 and this documentation spine.

#### Known issues
See [DEFECT_REGISTER.md](../testing/DEFECT_REGISTER.md) — 1 P0, 8 P1, 4 P2 open.
