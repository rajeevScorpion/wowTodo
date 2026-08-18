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

## Docker storage lives on E:

`C:` filled to 0.2 GB free on 2026-08-17, which wedged the Docker daemon. Docker's 31 GB
WSL data directory was moved to `E:\DockerData\wsl`, with a **directory junction** left at
the original path:

```
C:\Users\User\AppData\Local\Docker\wsl  ->  E:\DockerData\wsl
```

Docker is unaware of the move — it opens the same path, so no Docker setting depends on
it. To reverse: stop Docker, delete the junction, move the folder back. Do **not** delete
the junction while Docker is running. If Docker is reinstalled or factory-reset, the
junction may be replaced by a real directory on `C:` and the move must be redone.

## The Supabase CLI is pinned — avoid bare `npx supabase`

`supabase` is an **exact** devDependency at `2.40.7`. There was previously no pin, so
`npx supabase` silently used whatever npm had cached. Clearing the npm cache to free disk
space caused npx to fetch `2.114.0`, which references container image tags that no longer
resolve — breaking the entire local stack. The environment had been reproducible only by
accident of cache state.

Use `./node_modules/.bin/supabase` or an npm script. A bare `npx supabase` may still fetch
a newer CLI.

## Storage service is disabled

`[storage] enabled = false` in `supabase/config.toml`. WowTodo uses no buckets (verified
in the prompt-120 audit), and the storage-api container fails its own migration step
against the pinned CLI, which blocks the whole stack from starting. Re-enable only
alongside a compatible pinned image.

## Local Supabase

Ports are remapped to **55321–55329**; the default 54xxx range collides with another
Supabase project on this machine.

```bash
cd app
supabase start            # API 55321 · DB 55322 · Studio 55323
npm run db:reset:local    # supabase db reset — replay all 14 migrations
npm run db:diff:cloud     # confirm local matches the cloud project
```

`db:reset:local` is `supabase db reset`, which acts on the local stack defined by
`supabase/config.toml` and cannot touch the cloud project. It replaced a hand-rolled
script that replayed a hardcoded file list; that script also had to restore Supabase's
DEFAULT PRIVILEGES by hand, because its `drop schema public cascade` destroyed them and
every table came back with no grants (PostgREST then returned `42501`, which looks exactly
like an RLS bug). The CLI recreates the database properly, so that whole failure mode is
gone — confirmed by `npm run verify:rls` passing 17/17 through PostgREST after a reset.

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
