# Prompt 170 — Google Play Release Readiness Audit

**Mode:** AUDIT + VERIFY

## Objective
Determine exactly what blocks or risks Google Play submission/publication for WowToDo.

## Inspect local project
- application/package ID and whether it is final;
- app name/version/versionCode scheme;
- targetSdk/compileSdk/minSdk and how Expo/native configuration derives them;
- production build profile and AAB path;
- signing configuration ownership/availability without exposing secrets;
- permissions actually declared vs features that require them;
- microphone/notification/storage/media permissions and justifications;
- exported components/deep links/app links if present;
- icons/adaptive icon/splash/branding assets;
- debuggable/release flags and source maps as relevant;
- privacy policy URL/config if present;
- account creation/deletion behaviour if accounts exist;
- third-party SDK/data collection inventory;
- crash/ANR readiness and release logging.

## Inspect Play Console status when the owner/connected environment provides safe access
Do not guess. Determine:
- whether this is a new listing or existing Play app;
- developer account type and whether new-personal-account production testing requirements apply;
- app creation/listing status;
- internal/closed/open/production track status;
- tester requirements/status if applicable;
- app content declarations still required;
- Data safety status;
- privacy policy;
- ads declaration;
- content rating;
- target audience/children status;
- app access instructions;
- sensitive permission declarations;
- store listing assets/text/screenshots;
- country/pricing/distribution setup if relevant.

If Play Console cannot be inspected, create an explicit owner-input checklist and mark these items `UNVERIFIED`.

## Current-policy verification
If network access is available, re-check official Google Play/Android sources on the day of execution. Do not rely solely on this pack's dated snapshot.

## August 2026 target API consideration
The dated snapshot in `REFERENCE/06_ANDROID_PLAY_POLICY_SNAPSHOT_2026-08-17.md` records that new apps/updates must target Android 16/API 36 starting August 31, 2026; before that date API 35 is the current submission floor for standard mobile apps. Because the owner intends continued development, assess whether API 36 should be adopted now safely or scheduled immediately after release.

## Required output
A gate table with `PASS / FAIL / BLOCKED / UNVERIFIED / NOT APPLICABLE`, evidence, owner action, engineering action and priority P0–P3.

Separate:
1. local engineering blockers;
2. Play Console/account/policy blockers;
3. store asset/content blockers;
4. optional polish.

Do not upload or publish anything in this prompt.
