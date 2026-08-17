# Windows Development Setup

Verified on the owner's machine: Windows 11, Node v22.17.0, Android Studio JBR (JDK 21).

## Environment variables

`ANDROID_HOME`, `JAVA_HOME` and the emulator are **not on PATH by default**. Set them per
PowerShell session:

```powershell
$env:JAVA_HOME    = "C:\Program Files\Android\Android Studio\jbr"   # JDK 21
$env:ANDROID_HOME = "D:\AndriodSDK"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"
```

## Local Supabase

Ports are remapped to **55321–55329**; the default 54xxx range collides with another
Supabase project on this machine.

```bash
cd app
supabase start            # API 55321 · DB 55322 · Studio 55323
npm run db:reset:local    # replay all 12 migrations in dependency order
```

`db:reset:local` resolves its container from `supabase/config.toml` `project_id`
(`supabase_db_wowtodo`) and refuses to run against anything else, so it cannot touch the
cloud project.

## Emulator networking

The Android emulator reaches the host at **`10.0.2.2`**, never `127.0.0.1`:

```
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:55321
```

## Emulator microphone — required for voice

Voice transcription silently returns "No speech detected" unless **both** are true:

1. The emulator was launched with host audio routing:
   ```powershell
   emulator -avd <name> -allow-host-audio
   ```
   (`hw.audioInput=yes` must also be set in the AVD's `config.ini`.)
2. **Extended Controls → Microphone → "Virtual microphone uses host audio input"** is ON.

> This toggle **resets every time the emulator restarts** and cannot be automated —
> `adb emu` has no microphone command. It is the single most common cause of a false
> "voice is broken" report. Also check the host laptop's mic is not muted.

## Known Windows/Git Bash pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Pulled file is larger than on device and corrupt | `adb shell` injects CRLF | use `adb exec-out` |
| Path becomes `C:/Program Files/Git/data/data/...` | MSYS path mangling | prefix `MSYS_NO_PATHCONV=1` |
| `UID: readonly variable` | `UID` is reserved in Bash | rename the variable |
| Metro fails on ESM resolution | known metro-config issue | `patch-package` applies the fix via `postinstall` |

## Verify the setup

```bash
cd app
npx expo-doctor     # expect 17/18 (expo-asset peer dep is a known open item)
npm run typecheck   # expect 0 errors
npm test            # expect 12/12
```
