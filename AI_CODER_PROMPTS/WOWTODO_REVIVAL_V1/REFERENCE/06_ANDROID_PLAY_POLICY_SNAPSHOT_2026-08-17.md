# Android / Google Play Policy Snapshot — 2026-08-17

This file is a dated planning snapshot, **not a substitute for checking the live official policy at submission time**.

## Target API
Official Google Play/Android guidance indicates:
- before August 31, 2026, standard mobile new apps and updates are required to target at least Android 15 / API 35;
- starting **August 31, 2026**, standard mobile new apps and app updates must target **Android 16 / API 36 or higher**.

Because WowToDo is being revived just before this transition, the coder must assess whether API 36 is safely supported by the verified project stack. Do not force a destabilising major upgrade merely for neatness, but do not leave the project without an explicit API 36 path.

Official references:
- Google Play Console Help — Target API level requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Android Developers — Meet Google Play's target API level requirement: https://developer.android.com/google/play/requirements/target-sdk

## New personal developer account testing
Google Play documents a production-access testing requirement for certain personal developer accounts created after November 13, 2023: a closed test with at least 12 testers continuously opted in for at least 14 days before applying for production access. The coder must determine whether this requirement applies to the owner's actual developer account rather than assuming it does or does not.

Official reference:
- https://support.google.com/googleplay/android-developer/answer/14151465

## Data safety / privacy
Google requires accurate Data safety disclosures, including relevant data collection/sharing by third-party SDKs. A privacy policy is required to complete the Data safety form. External AI integrations and audio/transcription flows must therefore be mapped factually.

Official references:
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/17190352

## Execution rule
Re-verify these requirements from official Google sources immediately before release submission because policy can change.
