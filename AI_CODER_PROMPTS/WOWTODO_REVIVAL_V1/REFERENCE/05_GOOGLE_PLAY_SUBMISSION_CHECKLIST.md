# Google Play Submission Checklist — Audit Template

Use current official Play Console requirements on the execution date. Mark `PASS / FAIL / BLOCKED / UNVERIFIED / N/A`.

## Engineering artifact
- final package/application ID;
- version name/versionCode;
- compliant target API level;
- release AAB builds successfully;
- production signing available and backed up appropriately;
- release build not debuggable;
- required permissions only;
- microphone permission has clear user-facing purpose;
- sensitive permission declarations if any;
- app links/deep links/exported components safe;
- crash/ANR obvious blockers absent;
- supported device/API behaviour checked.

## Account/track
- developer account type/verification status;
- new personal account testing rule applicability checked;
- internal/closed test status;
- production access status;
- testers/required duration satisfied if applicable.

## App content/policy
- privacy policy;
- Data safety form;
- third-party SDK data collection mapped;
- account deletion disclosure/path if account creation applies;
- ads declaration;
- app access/login instructions;
- content rating;
- target audience/children declaration;
- sensitive permissions/API declarations;
- AI/user-data policy implications checked for external AI integrations.

## Store listing
- app name;
- short/full description;
- app icon;
- feature graphic if required/currently applicable;
- phone screenshots;
- tablet screenshots if device support/console requires them;
- category/tags;
- support contact;
- countries/distribution/pricing.

## Release
- release notes;
- rollout strategy;
- monitoring owner;
- rollback/hotfix approach;
- post-release smoke test.
