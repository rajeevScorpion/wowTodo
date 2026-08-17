# Decision Log

Newest first. Each entry records what was decided, why, and what it rules out.

---

### D-009 · Documentation spine lives at repo root `docs/`
**2026-08-17 · prompt 140**
`docs/` covers the whole monorepo; `app/CLAUDE.md` remains the app-local agent instruction
file; `app/context/` keeps its existing feature deep-dives. Linked, not duplicated —
one source of truth per fact.

### D-008 · Whisper only; no on-device speech recognition
**2026-08-17 · owner**
Whisper is materially more accurate than Android's built-in recogniser, and accuracy is
the product's foundation. Verified absent: no `SpeechRecognizer`, `android.speech`,
`expo-speech`, `@react-native-voice`. **Rules out** offline transcription and makes voice
capture network-dependent.

### D-007 · AI keys move server-side behind `ai-proxy`
**2026-08-17 · prompt 110**
`EXPO_PUBLIC_*` keys are inlined into the bundle and trivially extractable. A thin Deno
Edge Function holds the keys, verifies the user JWT and allow-lists models. Deliberately a
**passthrough** — prompt construction, parsing and fallback stay client-side, so the
product logic did not move and behaviour is unchanged. Verified: 0 provider secrets in a
production bundle. **Cost:** a new deploy target and a `503` failure mode if cloud secrets
are unset.

### D-006 · Reminders use a 60-item rolling window
**2026-08-17 · prompt 110**
iOS silently discards pending local notifications beyond 64 and Android has practical
limits, so an unbounded scheduler loses reminders with no error. Schedule the 60 soonest
and top up on foreground (throttled to 30 min). **Trade-off:** a user with hundreds of
future reminders gets only the nearest 60 scheduled at any moment — correct, because the
rest are topped up long before they are due.

### D-005 · Local Supabase mirrors cloud, ports 55321–55329
**2026-08-17**
Enables migration testing without touching production. Non-default ports because 54xxx
collides with another Supabase project on the owner's machine. `db:reset:local` pins
itself to `supabase_db_wowtodo` and cannot reach the cloud project.

### D-004 · Generated database types replace the hand-written `Database` type
**2026-08-17 · prompt 110**
The hand-written type had drifted from the real schema, leaving the client effectively
untyped — the root cause of 24 type errors. `npm run gen:types` regenerates from the local
schema. Immediately caught a real bug (raw `reminder_settings` rows used without
`rowToReminderSettings`). **Obligation:** regenerate after every migration.

### D-003 · Import `goodtodo` files without git history
**2026-08-17 · owner**
All 8 branches of `goodtodo` had a committed `.env` with live OpenAI and Gemini keys, and
`wowTodo` is public. Imported files-only via `git archive` (136 files, `.env` excluded).
History preserved offline in `d:\DEV\wowtodo\goodtodo-history-archive.bundle`.
**Consequence:** no `git blame` before 2026-08-17; the keys still require rotation.

### D-002 · App and web are independent; no workspace tooling
**2026-08-17 · owner**
`app/` is the product; `web/` is a promotional site. No root `package.json`, no hoisting —
dependency hoisting is a common cause of broken Expo/RN builds and the two share nothing.
**Rules out** shared components or a shared design system without revisiting this.

### D-001 · `app/` + `web/` at the repository root
**2026-08-17 · owner**
Both ship for launch and belong in one repo. 30 tracked files were moved into `web/` with
`git mv` so rename history is preserved.

---

## Open decisions

| # | Question | Blocks | Owner input? |
|---|---|---|---|
| O-1 | **Is share-recipient *editing* intended collaboration, or a bug?** Determines whether F1 is fixed by locking to `completed` only, or by scoping shared editing properly | **F1 (P0)** | **Yes** |
| O-2 | Should `search_users` return email at all? Exact-match-only would preserve email-based sharing and close the enumeration oracle | F5 | Yes |
| O-3 | Is `expo-updates` (OTA) intended for v1? It adds `WAKE_LOCK` and a native module with no configured channel | scope | Yes |
| O-4 | Does the 12-tester / 14-day closed-test rule apply? Depends on Play account age — not inspectable from the repo | release timeline | Yes |
| O-5 | Archive or delete the `goodtodo` GitHub repo (after backing the bundle up off this laptop) | cleanup | Yes |
