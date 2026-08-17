# Prompt 170 — Google Play Release Readiness Audit

- **Mode:** AUDIT + VERIFY · nothing uploaded or published
- **Date:** 2026-08-17
- **Verdict:** **NOT READY.** 6 release blockers, 4 of them requiring owner action that no
  agent can perform. The **engineering** side is in better shape than expected — the
  blockers are predominantly policy, content and account items.

## Current-policy verification (checked live, 2026-08-17)

The pack's dated snapshot was re-verified against official Google sources today and is
**accurate**:

- From **31 August 2026**, new apps *and updates* must target **Android 16 / API 36+**.
- Existing apps must target API 35+ to stay available to new users.
- An **extension to 1 November 2026** may be requested if more time is needed.

**WowTodo already targets API 36** (verified in the generated release manifest, prompt 130),
so this transition — 14 days away — is a non-issue.

---

## 1. Local engineering blockers

| # | Gate | Status | Evidence | Priority |
|---|---|---|---|---|
| E1 | Package ID final | **PASS** | `com.wowtodo.app`, consistent across Android/iOS | — |
| E2 | Version / versionCode | **PASS** | `1.0.0` / `versionCode 1` / iOS `buildNumber 1` | — |
| E3 | targetSdk / minSdk | **PASS** | 36 / 24 from the release merged manifest | — |
| E4 | Production build profile | **PASS** | `eas.json` → `production`: `distribution: store`, `buildType: app-bundle` (AAB) | — |
| E5 | **Signing** | **BLOCKED** | `android/app/build.gradle` has `release { signingConfig signingConfigs.debug }`. `android/` is gitignored and CNG-generated, so this only affects **local** release builds — **EAS Build injects its own credentials**. Must be confirmed, not assumed | **P0** |
| E6 | Not debuggable in release | **PASS** | 0 occurrences of `android:debuggable="true"` | — |
| E7 | Icons / adaptive icon / splash | **PASS** | `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` present | — |
| E8 | Exported components | **PASS** | Only `MainActivity`, `FirebaseInstanceIdReceiver`, `ProfileInstallReceiver` — all standard | — |
| E9 | Deep links | **PASS** | Single filter, custom scheme `wowtodo`, no `autoVerify`, no host. No App Links means no `assetlinks.json` obligation | — |
| E10 | Cleartext traffic in release | **PASS** | Not set → defaults false | — |
| E11 | Secrets in bundle | **PASS** | Production bundle scan: 0 `sk-`, 0 `AIza`, 1 public anon key | — |
| E12 | **Account deletion** | **FAIL** | Only `supabase.auth.signOut()` exists. Play **requires** an in-app deletion path *and* a web-accessible deletion URL for apps with account creation | **P0** |
| E13 | **Crash/ANR reporting** | **FAIL** | No Sentry/Crashlytics/Bugsnag. Play Console vitals will report crashes, but with no stack traces you cannot diagnose them | P2 |
| E14 | **F1 (P0) security defect** | **FAIL** | A share recipient can seize another user's data — shipping this is a user-harm risk | **P0** |
| E15 | **F5 (P1) email disclosure** | **FAIL** | Any authenticated user can harvest every user's email — a Data Safety misstatement waiting to happen | **P0** |
| E16 | Cloud AI secrets + function deploy | **BLOCKED** | `ai-proxy` is **not deployed** and cloud secrets are **not set**. Every AI call returns `503` in production — the app's core feature would be dead on arrival | **P0** |
| E17 | `expo-asset` peer dep | **FAIL** | `expo-doctor` 17/18, "may crash outside Expo Go" | P1 |
| E18 | OTA updates configured | **PASS** | `updates.url` + EAS channels `dev`/`preview`/`production`. Resolves open decision O-3: expo-updates **is** intentional | — |

## 2. Play Console / account / policy blockers

**All UNVERIFIED — the Play Console cannot be inspected from this environment.** No
credentials are available and none should be shared with an agent. Every row below needs
the owner.

| # | Gate | Status | Owner action |
|---|---|---|---|
| C1 | New listing vs existing app | **UNVERIFIED** | Confirm whether `com.wowtodo.app` already exists in Play |
| C2 | **Developer account type / age** | **UNVERIFIED** | If the account is *personal* and was created after **13 Nov 2023**, a closed test with **≥12 testers opted in for ≥14 continuous days** is required before production access. **This alone can add 2+ weeks to the timeline** — resolve first |
| C3 | App content declarations | **UNVERIFIED** | Complete in console |
| C4 | **Data safety form** | **BLOCKED** | Cannot be completed without a privacy policy (S1). Map below |
| C5 | **Privacy policy URL** | **FAIL** | None exists anywhere in the repo. **Hard blocker** — audio leaves the device to a third party | 
| C6 | Content rating questionnaire | **UNVERIFIED** | Complete in console |
| C7 | Target audience / children | **UNVERIFIED** | Declare; if under-13 is targeted, additional obligations apply |
| C8 | Ads declaration | **UNVERIFIED** | App serves no ads — declare "No" |
| C9 | App access instructions | **UNVERIFIED** | App is behind a login — Play **requires** working demo credentials for review, or the review will fail |
| C10 | Sensitive permission declarations | **UNVERIFIED** | `RECORD_AUDIO` and `SCHEDULE_EXACT_ALARM` justifications |
| C11 | Countries / pricing | **UNVERIFIED** | Free app; set distribution |

## 3. Store asset / content blockers

| # | Asset | Status |
|---|---|---|
| S1 | **Privacy policy (hosted URL)** | **MISSING — hard blocker.** The `web/` marketing site is the natural host |
| S2 | Feature graphic 1024×500 | **MISSING** |
| S3 | Phone screenshots (min 2) | **MISSING** |
| S4 | Short (80 char) + full (4000 char) description | **MISSING** |
| S5 | App icon 512×512 | Derivable from `assets/images/icon.png` — verify dimensions |
| S6 | Tablet screenshots | Optional |

## 4. Data Safety map

Must be declared accurately. Understating third-party sharing is a common rejection cause.

| Data type | Collected | Shared | Purpose | Notes |
|---|---|---|---|---|
| Email address | Yes | No | Account management | Also **disclosed to other users** via `search_users` — **F5 makes the truthful answer worse than intended** |
| Name, avatar, DOB, profession, city, bio | Yes (optional) | With other users when sharing | Profile | |
| **Voice audio** | Transmitted, not stored by the app | **Yes — OpenAI (US)** | Transcription | Must be declared. Highest-risk item |
| Task / todo content | Yes | **Yes — OpenAI, and Google if fallback fires** | Core functionality | |
| Device / FCM token | Yes | No | Notifications | `FirebaseInstanceIdReceiver` is present via expo-notifications even though only **local** notifications are used |

## 5. Permission justifications

| Permission | Needed for | Risk |
|---|---|---|
| `RECORD_AUDIO` | Voice capture — core feature | Low, clearly justified |
| `POST_NOTIFICATIONS` | Reminders | Low |
| `SCHEDULE_EXACT_ALARM` | Time-accurate reminders | Medium — may need justification; correctly avoids Play-restricted `USE_EXACT_ALARM` |
| `RECEIVE_BOOT_COMPLETED` | Restore reminders after reboot | Low |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | **Transitive from expo-audio** | ⚠️ App has no media playback. Declare truthfully or suppress via `blockedPermissions` |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | **Transitive from expo-secure-store** | ⚠️ Unused feature — same treatment |

## 6. Release blockers, consolidated

**P0 — must clear before any submission**

1. **Privacy policy** written and hosted (C5/S1) — blocks the Data Safety form, which blocks submission.
2. **In-app account deletion** + web deletion URL (E12).
3. **Deploy `ai-proxy` and set cloud secrets** (E16) — otherwise the core feature returns `503` in production.
4. **Fix F1** — recipient can seize another user's data (E14).
5. **Fix F5** — every user's email is harvestable (E15).
6. **Confirm signing** is EAS-managed or create an upload keystore (E5).

**P1**
7. `expo-asset` direct dependency (E17).
8. Resolve the **12-tester / 14-day** question (C2) — a timeline risk, not a technical one.
9. Store listing assets and copy (S2–S4).
10. Test on a **physical device** — all evidence so far is emulator-only.

**P2 / polish**
11. Crash reporting (E13).
12. Suppress or justify the unused transitive permissions.
13. Hide or finish the Analytics "Coming soon" stub (DF-3) — a reachable dead-end screen is a quality signal reviewers notice.

## 7. Owner-input checklist

No agent can resolve these:

- [ ] Play developer account type, and creation date relative to 13 Nov 2023 → does the 12-tester rule apply?
- [ ] Does a Play listing for `com.wowtodo.app` already exist?
- [ ] Where will the privacy policy be hosted? (`web/` is the obvious home)
- [ ] Demo account credentials for Play review (C9)
- [ ] EAS-managed signing, or supply an upload keystore?
- [ ] Confirm the app does not target children

## 8. Restrictions honoured

Nothing uploaded, published or submitted. No Play Console access attempted. No secrets
printed. Live policy re-verified from official Google sources as the prompt requires.

**Sources:**
- [Target API level requirements for Google Play apps — Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Meet Google Play's target API level requirement — Android Developers](https://developer.android.com/google/play/requirements/target-sdk)
