# Google Play Release Readiness

**Status: NOT READY.** Preliminary — the authoritative assessment is **prompt 170**.
This document records what is already known from prompts 100–140.

Policy snapshot: [`06_ANDROID_PLAY_POLICY_SNAPSHOT_2026-08-17.md`](../../AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/REFERENCE/06_ANDROID_PLAY_POLICY_SNAPSHOT_2026-08-17.md).
**Re-verify against live Google policy immediately before submission.**

## Resolved

| Requirement | Status | Evidence |
|---|---|---|
| **Target API ≥ 36** (required from 31 Aug 2026) | ✅ **MET** | release manifest `targetSdkVersion=36`, `minSdkVersion=24` |
| No `SYSTEM_ALERT_WINDOW` in release | ✅ | absent — debug-variant only |
| No storage permissions | ✅ | `blockedPermissions` working |
| No `QUERY_ALL_PACKAGES` | ✅ | absent |
| No Play-restricted `USE_EXACT_ALARM` | ✅ | uses `SCHEDULE_EXACT_ALARM` |
| No cleartext traffic in release | ✅ | not set → defaults false |
| No secrets in the app bundle | ✅ | 0 `sk-`, 0 `AIza`; 1 public anon key |
| Package / version | ✅ | `com.wowtodo.app`, `versionCode 1`, `versionName 1.0.0` |

## Blockers

| # | Blocker | Severity |
|---|---|---|
| B1 | **No privacy policy.** Required to complete the Data Safety form. Non-negotiable given audio leaves the device | **BLOCKER** |
| ~~B2~~ | ~~**No in-app account deletion.**~~ | ✅ **RESOLVED** — see below |
| B3 | **Data Safety form not mapped.** Must declare audio, email, name, user content, and third-party sharing with OpenAI/Google | **BLOCKER** |
| B4 | **Release build is debug-signed** (`signingConfig signingConfigs.debug`). Play rejects it. Needs an upload keystore or confirmed EAS-managed signing | **BLOCKER** |
| B5 | **F1 (P0)** — a share recipient can seize another user's data | **BLOCKER** |
| B6 | **F5 (P1)** — every user's email is disclosed to any authenticated user | **BLOCKER** |
| B7 | Never tested on a physical device | HIGH |
| B8 | 12-tester / 14-day closed test may apply — depends on the owner's Play account age | **UNKNOWN** |

## Account deletion (B2 / D1) — what to enter in the Play Console

Play requires **both** halves, and grants the listing neither if only one exists.

| Half | Where | Status |
|---|---|---|
| In-app path | **Settings → Delete account → type `DELETE`** | ✅ shipped |
| Web URL, reachable without installing the app | `https://<site>/delete-account` | ✅ page written — **needs the site deployed and the real URL pasted into the Console** |

The web URL goes in **Play Console → App content → Data safety → Data deletion**, as the
"Account deletion URL". The page (`web/src/pages/DeleteAccount.tsx`) states the in-app
steps, an email route for users who no longer have the app, and exactly what is deleted
versus retained — Play reviewers read it, and it must keep matching what the code does.

Deletion is immediate and total: one admin delete of the `auth.users` row cascades to all
nine tables. Proven by `npm run verify:account-deletion` (31 assertions, both directions).

Two owner actions remain:

1. **Deploy the marketing site** and paste the live `/delete-account` URL into the Console.
2. **Make `privacy@wowtodo.app` a real, monitored mailbox.** The page publishes it as the
   route for users who cannot sign in; an address that bounces is a rejection risk and,
   more importantly, a broken promise.

## Data Safety — preliminary map

| Data | Collected | Shared with | Purpose |
|---|---|---|---|
| Email address | yes | — | account |
| Name, avatar, DOB, profession, city, bio | yes (optional) | other users when sharing | profile |
| **Voice audio** | **transmitted, not stored by the app** | **OpenAI (US)** | transcription |
| Task/todo text | yes | OpenAI / Google (AI decomposition); other users when shared | core function |
| Device notification token | yes | — | reminders |

Audio and task text leaving the device to third-party AI providers **must** be declared.
This is the most likely source of a Data Safety rejection if understated.

## Permissions to justify

| Permission | Justification | Note |
|---|---|---|
| `RECORD_AUDIO` | voice task capture | core feature |
| `POST_NOTIFICATIONS` | reminders | |
| `SCHEDULE_EXACT_ALARM` | time-accurate reminders | may need a declaration |
| `RECEIVE_BOOT_COMPLETED` | restore reminders after reboot | |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | **transitive from expo-audio** | ⚠️ app has no media playback — declare truthfully or suppress |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | **transitive from expo-secure-store** | ⚠️ unused feature — same |

## Before submission

1. Clear all blockers above.
2. Deploy `ai-proxy` and set cloud secrets — otherwise every AI call returns `503` in production.
3. Rotate the OpenAI and Gemini keys.
4. Complete [REGRESSION_CHECKLIST.md](../testing/REGRESSION_CHECKLIST.md) on a physical device.
5. Re-verify target API and policy against live Google sources.
