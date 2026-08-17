# Prompt 130 — Dependency, Native and Upgrade Assessment

**Mode:** AUDIT

## Objective
Determine what actually needs upgrading or changing for reliable development and Google Play readiness, while explicitly avoiding latest-version churn.

## Inspect
- package.json/workspace manifests and lockfile;
- Expo SDK/React Native/React/TypeScript versions;
- speech/audio, AI SDK, Supabase/client, navigation/state, notifications, storage, analytics libraries;
- native Android Gradle Plugin, Gradle wrapper, Kotlin, JDK expectations, compileSdk/targetSdk/minSdk where applicable;
- Expo config/config plugins/native modules;
- deprecated/unmaintained packages and compatibility warnings;
- dependency security/audit output using ecosystem-appropriate tools when safe and interpretable;
- current Play target API requirement and the imminent next requirement using official Google sources if network access is available.

## Classify every meaningful candidate
- `REQUIRED-NOW` — build, security, core defect or store policy blocker.
- `RECOMMENDED-BEFORE-RELEASE` — low/moderate risk and meaningful release reliability benefit.
- `SAFE-TO-DEFER` — beneficial but unnecessary for this release.
- `DO-NOT-UPGRADE-NOW` — working/compatible and upgrade risk exceeds release benefit.
- `NEEDS-SPIKE` — unclear compatibility; requires isolated proof before decision.

For each: current version, candidate version/range if justified, reason, compatibility dependencies, expected files affected, migration/native regeneration implications, test scope and rollback approach.

## Special August 2026 rule
As of the pack snapshot, Google Play changes the new-app/update target requirement on **August 31, 2026**. The owner targets release before then, but WowToDo should not knowingly create an immediate update dead-end. Assess whether targeting API 36 now is safely supported by the verified stack. Prefer it only when supported without a destabilising upgrade. If API 35 is the safe short-term release target, explicitly document the API 36 follow-up blocker/plan.

## Restrictions
Do not upgrade anything in this prompt. Do not regenerate native projects. Do not change lockfiles/configuration.
