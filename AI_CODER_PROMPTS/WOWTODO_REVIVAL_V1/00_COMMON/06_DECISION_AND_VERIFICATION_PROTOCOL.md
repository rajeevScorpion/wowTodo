# Decision and Verification Protocol

## Major-change triggers
An evidence report and explicit product-owner decision are required before:
- major Expo/React Native/Node/Gradle/AGP/Kotlin/JDK upgrades;
- navigation/state/auth architecture changes;
- replacing speech-to-text or AI providers;
- changing AI response contract or todo data ownership in a breaking way;
- adding a paid service or materially changing inference cost;
- changing package/application ID or signing strategy;
- changing RLS/admin roles;
- deleting/renaming/transforming stored data;
- adding intrusive Android permissions;
- introducing offline conflict resolution;
- breaking API/schema changes.

## Required pre-change report
1. Verified current state.
2. Evidence/files/config/database objects inspected.
3. Problem/constraint.
4. 2–3 viable options when material.
5. Recommended option and repository-specific rationale.
6. Risks including release timing, data compatibility and rollback.
7. Exact approval requested.

## Bias checks
Explicitly challenge:
- **Greenfield bias:** replacing instead of preserving working code.
- **Latest-version bias:** upgrading because a newer version exists.
- **Framework bias:** choosing a familiar library without compatibility evidence.
- **Deadline bias:** skipping safeguards to appear faster.
- **Feature bias:** adding future vision before baseline is reliable.
- **AI demo bias:** judging quality from a handful of friendly utterances.
- **Happy-path bias:** ignoring permission, network, provider, malformed-output and duplicate cases.
- **Store-checklist bias:** treating Play Console compliance as only an AAB upload problem.

## Minor decisions
May be resolved autonomously only if local, reversible, compatible with verified conventions and not user-visible in a material way. Record them in the handoff.
