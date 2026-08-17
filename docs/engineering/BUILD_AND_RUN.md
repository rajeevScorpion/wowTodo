# Build and Run

Every command below has been executed successfully on the owner's machine.
Prerequisites: [WINDOWS_SETUP.md](WINDOWS_SETUP.md).

## App (`app/`)

```bash
npm install                 # postinstall runs patch-package (metro ESM fix)
supabase start              # local backend, ports 55321–55329
npm run db:reset:local      # replay 12 migrations

npx expo run:android        # build + install + launch (dev build)
npx expo start              # dev server against an installed build
```

> **Expo Go will not work.** Notifications and `expo-audio` need native modules; the app
> detects Expo Go and skips notification setup. Use a development build.

## Quality gates

```bash
npm run typecheck    # tsc --noEmit          → 0 errors
npm test             # jest                  → 12/12
npx expo-doctor      # 17/18 (expo-asset peer dep open)
npm run gen:types    # regenerate src/types/database.ts after any migration
```

`gen:types` matters: the generated `Database` type is what makes `supabase.from()` and
`rpc()` return real row types. It has already caught a real bug — raw `reminder_settings`
rows being used without `rowToReminderSettings`.

## Production bundle

```bash
npx expo export --platform android --output-dir <dir>
```

Produces a Hermes `.hbc` bundle (~8.45 MB). Useful for verifying what actually ships —
this is how secret placement and dependency reachability were confirmed.

## Release build

```bash
cd android
./gradlew :app:processReleaseMainManifest   # merged release manifest only
./gradlew assembleRelease                   # ⚠️ debug-signed, see below
```

> ⚠️ **`android/app/build.gradle` has `release { signingConfig signingConfigs.debug }`** —
> the Expo template default. Google Play **rejects** debug-signed artifacts. `android/` is
> gitignored and CNG-regenerated, so this only affects local release builds; EAS Build
> injects its own credentials. Must be settled before the first AAB.

## Native projects

`android/` and `ios/` are **gitignored and generated** (Continuous Native Generation).
`app.json` is the authoritative native config — hand-edits under `android/` are disposable
and will be lost on the next prebuild.

```bash
npx expo prebuild --clean   # regenerate native projects from app.json
```

## Web (`web/`)

Independent Vite project — separate `package.json` and lockfile, no shared tooling.

```bash
cd web && npm install && npm run dev
```

## Emulator

```powershell
emulator -avd <name> -allow-host-audio     # -allow-host-audio required for voice
adb devices
adb logcat -s ReactNativeJS:V              # JS logs
```

Use `adb exec-out` (never `adb shell`) when pulling binary data — `adb shell` injects CRLF
and corrupts it.
