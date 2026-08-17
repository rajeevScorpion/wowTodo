# Prompt 130 — Dependency, Native and Upgrade Assessment

- **Mode:** AUDIT (nothing upgraded, no native regeneration, no lockfile/config changes)
- **Date:** 2026-08-17
- **Headline:** **No upgrade is required for Play readiness.** `targetSdk` is already 36,
  satisfying the 31 Aug 2026 requirement 14 days ahead of the deadline. One
  `REQUIRED-NOW` item exists (`expo-asset` peer dependency) and it is additive, not an upgrade.

---

## 1. Verified stack

| Layer | Version | Source of truth |
|---|---|---|
| Expo SDK | 54.0.36 | `package.json` |
| React Native | 0.81.5 | `package.json` |
| React | 19.1.0 | `package.json` |
| TypeScript | 5.9.2 | `package.json`, `tsc --noEmit` clean |
| Gradle wrapper | 8.14.3 | `android/gradle/wrapper/gradle-wrapper.properties` |
| AGP / Kotlin | unpinned — resolved by `expo-root-project` | `android/build.gradle` |
| JDK | 21 (Android Studio `jbr`) | dev machine |
| `compileSdk` / `targetSdk` / `minSdk` | **36 / 36 / 24** | **release merged manifest** |

`expo-doctor`: **17/18 checks pass.**

Native `android/` and `ios/` are **gitignored and CNG-generated** — `app.json` is the
authoritative native config, and hand-edits to `android/` are disposable. This is the
correct posture and should be preserved.

---

## 2. Google Play target API — resolved, no action needed

The pack's special August 2026 rule asks whether API 36 is safely reachable. It is
**already the shipping value**, verified from the generated release manifest rather than
assumed from SDK defaults:

```
android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml
  android:minSdkVersion="24"  android:targetSdkVersion="36"
```

Expo SDK 54 defaults to API 36. **No upgrade, no spike, no follow-up blocker.** The
"API 35 now, API 36 later" fallback contemplated by the pack is unnecessary — the project
is on the far side of the transition already. Re-verify against live Google policy at
submission time per the pack's execution rule.

---

## 3. Release permission set (verified, not assumed)

An earlier read of the **debug** merged manifest showed `SYSTEM_ALERT_WINDOW` and
`usesCleartextTraffic="true"`, which would both be Play concerns. Both come from
`android/app/src/debug/AndroidManifest.xml` (React Native's dev-overlay variant) and are
**absent from release**. The release set is:

```
ACCESS_NETWORK_STATE   FOREGROUND_SERVICE   FOREGROUND_SERVICE_MEDIA_PLAYBACK
INTERNET   MODIFY_AUDIO_SETTINGS   POST_NOTIFICATIONS   READ_APP_BADGE
RECEIVE_BOOT_COMPLETED   RECORD_AUDIO   SCHEDULE_EXACT_ALARM
USE_BIOMETRIC   USE_FINGERPRINT   VIBRATE   WAKE_LOCK
(+ launcher-badge permissions from expo-notifications' ShortcutBadger)
```

| Check | Result |
|---|---|
| `SYSTEM_ALERT_WINDOW` | absent ✅ |
| `READ_/WRITE_EXTERNAL_STORAGE` | absent ✅ (`blockedPermissions` demonstrably works) |
| `QUERY_ALL_PACKAGES` | absent ✅ |
| `USE_EXACT_ALARM` (Play-restricted) | absent ✅ — correctly using `SCHEDULE_EXACT_ALARM` |
| `usesCleartextTraffic` in release | not set → defaults false ✅ |

**Carry to 170:** `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (from expo-audio) and
`USE_BIOMETRIC` / `USE_FINGERPRINT` (from expo-secure-store) are transitive and not
features the app offers. They are legal but invite reviewer questions and must be
declared truthfully or suppressed via `blockedPermissions`.

---

## 4. Dependency vulnerabilities — 44 reported, 0 reach the device

`npm audit`: **44 total — 1 critical, 25 high, 16 moderate, 2 low.** `npm audit --omit=dev`
still reports 40, because `expo` is a production dependency that itself depends on the
CLI, Metro and prebuild tooling. **npm cannot distinguish "production dependency" from
"code shipped in the APK".**

Settled empirically by exporting a real production bundle
(`npx expo export --platform android`, 8.45 MB Hermes) and scanning it, with a control
group to validate the method:

| Probe | Occurrences in shipped bundle |
|---|---|
| *Control* — `whisper-1`, `gpt-4o-mini` | 1, 1 ✅ method works |
| *Control* — `supabase`, `tamagui`, `expo-audio` | 50, 25, 3 ✅ |
| `shell-quote` (the CRITICAL) | **0** |
| `metro`, `postcss`, `node-forge`, `xmldom` | **0, 0, 0, 0** |
| `image-size`, `picomatch`, `js-yaml`, `minimatch`, `brace-expansion` | **0** |

> An earlier attempt using `strings` returned 0 for the controls too, which would have
> produced a false "all clear". The result above uses a method whose controls pass.

**Conclusion:** every critical/high advisory is in build-time tooling (Metro bundler, Expo
CLI, prebuild, dev server). None is reachable by an end user of the released app. They are
a **developer-workstation** supply-chain concern, not a release blocker.

`fixAvailable` for most is `expo@57` (`isSemVerMajor: true`) — an SDK 54→57 jump. Per the
pack's explicit anti-churn rule, **DO-NOT-UPGRADE-NOW**.

### Bonus verification — secrets are genuinely out of the client

The same bundle scan confirms the prompt-110 proxy migration worked:

| Pattern | Count |
|---|---|
| JWT-shaped (`eyJ…`) | **1** — the Supabase anon key, public by design ✅ |
| `sk-…` (OpenAI) | **0** ✅ |
| `AIza…` (Google) | **0** ✅ |

The dead `EXPO_PUBLIC_OPENAI_API_KEY` / `EXPO_PUBLIC_GEMINI_API_KEY` entries still sitting
in `.env` are **not** inlined, because no source file references them. Removing them is
hygiene, not an active leak.

---

## 5. Classification

### REQUIRED-NOW

| Item | Current | Action | Why |
|---|---|---|---|
| `expo-asset` | present only via `overrides` | add as **direct dependency** `~12.0.13` | `expo-doctor` fails: "Missing peer dependency, required by expo-audio… your app may crash outside Expo Go". This is the exact class of defect that caused the post-splash crash. `overrides` fixes the *version* but not the *declaration*. Files: `package.json`, lockfile. Test: `expo-doctor` 18/18, rebuild, confirm launch. Rollback: revert both files. |
| Release signing | `release { signingConfig signingConfigs.debug }` | generate an upload keystore **or** confirm EAS-managed signing | Play rejects debug-signed artifacts. This is the Expo template default in gitignored `android/`, so it only bites **local** release builds — EAS Build injects its own credentials. Must be settled before the first AAB. Carry to 170. |

### RECOMMENDED-BEFORE-RELEASE

| Item | Action | Why |
|---|---|---|
| `@tamagui/*` (`context-menu`, `create-menu`, `menu`) | non-major bump, `fixAvailable: true` | Only high-severity advisories in *runtime UI* code rather than build tooling. Verify the menu/popout surfaces after bumping. |
| Dead `.env` keys | delete the two `EXPO_PUBLIC_*_API_KEY` lines | Not bundled (proven above), but they invite reintroduction and are stale duplicates of the Edge Function secrets. |
| `expo-updates` | confirm intended | Installed and adds `WAKE_LOCK`; no evidence of a configured update channel. If OTA is not planned for v1, removing it drops a permission and a native module. |

### SAFE-TO-DEFER
Build-tool advisories fixable without a major (`ws`, `nanoid`, `tmp`, `minimatch`,
`picomatch`, `js-yaml`, `node-forge`, `brace-expansion`, `fast-uri`, `@xmldom/xmldom`).
Worth a routine `npm audit fix` **after** release, in isolation, with a full rebuild —
they touch the bundler, so breakage is a dev-environment outage.

### DO-NOT-UPGRADE-NOW
- **Expo SDK 54 → 57** — the fix npm proposes for ~20 advisories. Major RN/React churn,
  regenerates native projects, re-tests every native module, for **zero** end-user
  security benefit (§4). Revisit after release.
- **React Native 0.81.5** — npm suggests `0.72.17`, which is a **downgrade** and would
  break Expo 54. Ignore; this is npm resolving a fix path naively.
- Tamagui 2.0-rc line, Supabase JS, React Query, expo-router — all current and healthy.

### NEEDS-SPIKE
- **`expo-audio` `~1.1.1`** — the source of the `expo-asset` skew and the
  `NoClassDefFoundError: AnyTypeCache` crash. Currently pinned and working via
  `overrides`. Before changing anything here, prove it in isolation: the failure mode is a
  hard native crash at launch, not a type error.

---

## 6. Notes for later prompts

- **170:** upload keystore; declare `FOREGROUND_SERVICE_MEDIA_PLAYBACK`,
  `SCHEDULE_EXACT_ALARM`, `RECORD_AUDIO`; privacy policy covering audio sent to OpenAI.
- **180:** `expo-asset` is the only dependency item that should reach the blocker list.
- Personal-developer-account 12-tester/14-day closed-test rule is **unresolved** — it
  depends on the owner's actual Play account age, which cannot be inspected from the repo.

## 7. Restrictions honoured

No package installed, removed or upgraded. No lockfile change. No native regeneration
(`processReleaseMainManifest` only *reads* existing config to produce a manifest under
`android/build/`, which is gitignored build output). `git status` clean apart from the two
audit documents in `docs/audits/`.
