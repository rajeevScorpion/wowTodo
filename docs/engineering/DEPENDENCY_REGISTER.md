# Dependency Register

Assessed 2026-08-17. Full analysis: [130 audit](../audits/130_DEPENDENCY_NATIVE_AND_UPGRADE_ASSESSMENT.md).

## Core stack

| Component | Version | Posture |
|---|---|---|
| Expo SDK | 54.0.36 | **DO-NOT-UPGRADE-NOW** |
| React Native | 0.81.5 | DO-NOT-UPGRADE-NOW |
| React | 19.1.0 | current |
| TypeScript | 5.9.2 | current |
| Gradle wrapper | 8.14.3 | current |
| AGP / Kotlin | resolved by `expo-root-project` | leave unpinned |
| JDK | 21 (Android Studio JBR) | correct for SDK 54 |
| `compileSdk` / `targetSdk` / `minSdk` | **36 / 36 / 24** | ✅ meets Play's 31 Aug 2026 rule |

`expo-doctor`: **17/18**.

## Upgrade classification

### REQUIRED-NOW
| Item | Action | Reason |
|---|---|---|
| `expo-asset` | add as **direct dependency** `~12.0.13` | `expo-doctor` failure: missing peer dep of `expo-audio`, "may crash outside Expo Go". `overrides` pins the version but does not declare it. Same class as the post-splash crash |
| Release signing | upload keystore or confirm EAS-managed | Play rejects debug-signed artifacts |

### RECOMMENDED-BEFORE-RELEASE
- `@tamagui/{context-menu,create-menu,menu}` — non-major; the only high-severity advisories in *runtime* code.
- Delete dead `EXPO_PUBLIC_*_API_KEY` entries from `app/.env`.
- Confirm whether `expo-updates` is intended — it adds `WAKE_LOCK` and a native module with no configured channel.

### SAFE-TO-DEFER
Non-major build-tool advisories (`ws`, `nanoid`, `tmp`, `minimatch`, `picomatch`,
`js-yaml`, `node-forge`, `brace-expansion`, `fast-uri`, `@xmldom/xmldom`). Do them
post-release, in isolation — they touch the bundler, so breakage is a dev outage.

### DO-NOT-UPGRADE-NOW
- **Expo 54 → 57.** npm's proposed fix for ~20 advisories. Major churn, native
  regeneration, full re-test, for **zero** end-user security benefit.
- **React Native "fix" to 0.72.17** — that is a *downgrade* and would break Expo 54. npm is
  resolving a fix path naively; ignore.
- Tamagui 2.0-rc, Supabase JS, React Query, expo-router — current and healthy.

### NEEDS-SPIKE
- **`expo-audio ~1.1.1`** — source of the `expo-asset` version skew and the
  `NoClassDefFoundError: AnyTypeCache` crash. Pinned and working via `overrides`. Any
  change here must be proven in isolation; the failure mode is a hard native crash at
  launch, not a type error.

## Vulnerability posture

`npm audit`: **44 (1 critical, 25 high, 16 moderate, 2 low)**. `--omit=dev` still shows 40,
because `expo` is a production dependency that itself pulls in the CLI and Metro —
**npm cannot distinguish "production dependency" from "shipped in the APK"**.

Settled empirically by scanning a real production bundle, with controls to validate the
method:

| Probe | In shipped bundle |
|---|---|
| Controls: `whisper-1`, `supabase`, `tamagui`, `expo-audio` | ✅ found |
| `shell-quote` (critical), `metro`, `postcss`, `node-forge`, `xmldom`, `image-size`, `picomatch`, `js-yaml`, `minimatch` | **0** |

**Conclusion:** every critical/high advisory is build-time tooling. None is reachable by an
end user. This is a developer-workstation supply-chain concern, **not a release blocker**.

## `overrides`

```json
"overrides": { "expo-asset": "~12.0.13", "expo-constants": "~18.0.13" }
```

Present because `expo-audio@1.1.1` declares `expo-asset@~57.0.11`, which conflicts with
SDK 54's `~12.0.13` and caused a native crash at launch. **Do not remove without
rebuilding and confirming the app launches.**

## Patches

`patch-package` applies a metro-config ESM resolution fix on Windows via `postinstall`.
