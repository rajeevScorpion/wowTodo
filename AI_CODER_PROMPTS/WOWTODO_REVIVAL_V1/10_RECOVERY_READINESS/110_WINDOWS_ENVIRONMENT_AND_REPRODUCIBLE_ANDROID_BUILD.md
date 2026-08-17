# Prompt 110 — Windows Environment and Reproducible Android Build

**Mode:** VERIFY

## Objective
Prove that the cloned WowToDo repository can be installed, started, built and run reproducibly on this new Windows machine using the repository's intended toolchain, without upgrading the project merely to make it work.

## Preflight
Read Prompt 100 output. Inspect existing setup docs, lockfile and scripts. Record Git diff/status before verification.

## Required checks
1. Determine exact Node/JDK/package-manager/Expo CLI/Android SDK/Gradle/AGP expectations from the repository and generated/native config.
2. Record installed local versions relevant to WowToDo.
3. Compare local versions against project expectations and identify mismatches.
4. Use lockfile-respecting installation (`npm ci`, frozen lockfile equivalent, or verified repository command) when safe.
5. Verify environment-variable **presence/names**, never print secret values.
6. Start the development workflow using verified commands.
7. Run on the available Android emulator.
8. Verify clean app launch, basic navigation and authentication entry state without destructive remote operations.
9. Attempt the repository's appropriate Android build path (local/Expo/EAS/dev/preview/production as supported) up to the point safe credentials allow.
10. If a production/preview AAB/APK can be produced safely without changing remote production state, verify artifact creation and record how.
11. Identify old-machine assumptions: absolute paths, local SDK paths, keystore paths, machine-specific env/config, global CLI dependencies, cached credentials.
12. Recheck Git diff and identify any generated/unintended changes.

## Do not
- upgrade packages/toolchains during this prompt;
- rewrite Gradle/Android configuration simply to silence warnings;
- create a new Expo app;
- change package/application ID;
- rotate signing keys;
- publish/upload artifacts;
- print credentials or keystore secrets.

## Required report
- toolchain compatibility table: expected vs installed vs status;
- exact verified setup/start/build commands;
- emulator/device evidence;
- build result and failure classification if any;
- machine-specific blockers;
- repository diffs caused by verification and whether they should be kept/reverted;
- smallest next action for each blocker.

## Acceptance gate
A fresh AI coder on this machine should be able to reproduce the development workflow from documentation and verified commands, or the exact blockers must be known.
