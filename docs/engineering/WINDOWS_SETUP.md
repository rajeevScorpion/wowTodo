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

## The app points at CLOUD, not the local stack (since 2026-08-19)

`app/.env` sets `EXPO_PUBLIC_SUPABASE_URL` to the **cloud** project. Before this, the
emulator used the local stack while physical devices used cloud, so the same Google account
showed two completely different task lists — nothing was out of sync, the two clients simply
never shared a database. Pointing both at cloud is what makes device and emulator agree.

Accepted trade-off: development traffic reads and writes **real user data** and counts
against the project's quotas. The local stack is still used for `db:reset:local`,
`db:diff:cloud` and `verify:rls`.

The commented-out local block is kept in `.env`. To develop against the local stack, swap
the two blocks back and follow the loopback section below — which then applies again.

## Emulator networking — loopback, not `10.0.2.2`

The Android emulator's usual alias for the host is **`10.0.2.2`**, and that is what this
project used until 2026-08-18. It no longer works, because **Google sign-in is now the only
way into the app** and Google's OAuth console **rejects private IP addresses in an `http`
redirect URI**. `http://10.0.2.2:55321/auth/v1/callback` cannot even be saved there;
`http://127.0.0.1:55321/auth/v1/callback` can — loopback is the documented exception.

So the emulator reaches the local stack over loopback, forwarded by `adb`:

```bash
npm run emu:reverse     # adb reverse tcp:55321 + tcp:8081
```

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
```

> `adb reverse` is **per device and does not survive an emulator reboot or an `adb
> kill-server`**. Re-run `npm run emu:reverse` after either. The symptom when it is missing
> is every request failing with "Network request failed" — not an auth error.

### The dev bundle must load over loopback too, or the app hangs on a blank screen

The emulator's NAT (`10.0.2.2`) **corrupts large chunked HTTP responses**. The Metro dev
bundle is ~17 MB streamed as chunked multipart, and the framing desynchronises in transit:

```
Callback failure for call to http://10.0.2.2:8081/...
java.net.ProtocolException: Expected leading [0-9a-fA-F] character but was 0x2d
    at okhttp3.internal.http1.Http1ExchangeCodec$ChunkedSource.readChunkSize
    at com.facebook.react.devsupport.MultipartStreamReader.readAllParts
```

`0x2d` is `-`, the first byte of a multipart boundary turning up where a chunk-size header
belongs. The download never completes, so the JS context never initialises and the app sits
on a **blank white screen** — no red box, no JS logs, and `uiautomator dump` shows an empty
view tree. Metro looks healthy throughout and `10.0.2.2:8081/status` returns
`packager-status:running`, which makes this very easy to misdiagnose.

It is intermittent: a transfer occasionally survives, so the app can work once and then fail
every time afterwards.

**Why it happens.** React Native resolves the dev server in `PackagerConnectionSettings.kt`
(`node_modules/react-native/ReactAndroid/.../packagerconnection/`): it reads the
SharedPreferences key `debug_http_host` **first**, and only falls back to
`AndroidInfoHelpers.getServerHost()` — `10.0.2.2` on an emulator — when that key is empty.

### The fix

```bash
npm run emu:dev-host
```

It sets `debug_http_host = localhost:8081` in the app's preferences (via `run-as`, which
works because the dev build is debuggable) and runs `adb reverse tcp:8081`. `adb reverse` is
a raw TCP relay that never touches the payload, so the chunked stream arrives intact.

Re-run it after `adb kill-server`, an emulator reboot, or reinstalling the app — neither
`adb reverse` nor app preferences survive any of those.

Verify:

```bash
adb logcat -d | grep -E "Loading from|ProtocolException"
```

Expect `Loading from localhost:8081` and **no** `ProtocolException`.

### Do not bother with these

All were tried and none fix this fault: restarting Metro, `expo start --clear`,
`expo start --localhost`, the `expo-development-client` deep link (works once, does not
survive a relaunch), `adb shell pm clear`, rebooting the emulator, and `expo run:android`
(which re-bakes `10.0.2.2`).

### Diagnosing it in one step

```bash
adb logcat -d | grep -c ReactNativeJS    # 0 means JS never ran at all
```

**0 `ReactNativeJS` lines + a `ProtocolException` = transport, not app code.** Metro printing
`Android Bundled` proves only that Metro *built* the bundle — never that the device received
it. That single distinction is what makes this fault look like an app bug for hours.

On a **physical device** use the machine's LAN IP instead; Google sign-in there goes through
the cloud project, which already has its own redirect URIs configured.

## A NEW Edge Function needs a stack restart, not just a file

The functions directory is bind-mounted into `supabase_edge_runtime_*`, so **edits** to an
existing function are picked up immediately. A **newly created** function is not: the
runtime builds its function map when the container starts, so the new name 404s with
`{"error":"Function not found"}` no matter how many times the file is saved.

```bash
supabase stop && supabase start     # the only thing that re-reads the function list
```

The startup log is the confirmation — it prints one line per function it will serve:

```
Serving functions on http://127.0.0.1:55321/functions/v1/<function-name>
 - http://127.0.0.1:55321/functions/v1/ai-proxy
 - http://127.0.0.1:55321/functions/v1/delete-account
```

When a function returns an unexpected status, `docker logs supabase_edge_runtime_wowtodo`
carries the `console.error` output and the real upstream body — which is where the cause
actually is. Read it before changing any code.

### A MULTI-MODULE function needs a container restart for every edit

The "edits are picked up immediately" rule above holds for a **single-file** function. It
does **not** hold for one that imports other modules — `ai-agent` pulls in `../_shared/`,
`./agents/`, `./validate.ts`. The runtime compiles the module graph once and keeps serving
it, so an edit to any file changes nothing at all:

```bash
docker restart supabase_edge_runtime_wowtodo && sleep 6
```

`supabase stop && supabase start` also works but takes far longer.

This is worth knowing before it costs you an afternoon. The symptom is that the function
keeps behaving exactly as it did, so the natural conclusion is that the change was wrong —
and you go and "fix" a prompt that was already correct. The tell is a **new field you just
added being absent from the response**: a stale bundle cannot emit a key it has never
compiled. Add one deliberately if you are unsure whether your code is live.

## Google sign-in on the local stack

The local stack and the cloud project are **completely separate auth backends**. Enabling
Google in the Supabase dashboard does nothing for the emulator. While `[auth.external.google]`
was missing from `supabase/config.toml`, every emulator sign-in rendered a white page showing

```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

Google is now enabled in `supabase/config.toml`, reading credentials from `app/.env` — the
Supabase CLI resolves `env(...)` substitutions from a `.env` in the directory the command
runs in, so no shell exports are needed:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=…apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=…
```

Reuse the **same** Google OAuth client as the cloud project, and add one entry to its
**Authorized redirect URIs** in the Google Cloud console:

```
http://127.0.0.1:55321/auth/v1/callback
```

`skip_nonce_check = true` is set for the local provider — the nonce cannot round-trip through
the loopback redirect. It applies to the local stack only.

**Config changes need a stack restart** (`supabase stop && supabase start`); `supabase start`
alone will not pick them up. Verify with:

```bash
curl -s http://127.0.0.1:55321/auth/v1/settings   # expect "google":true
```

Email/password remains enabled on the local stack even though the app no longer offers it:
`npm run verify:rls` creates its fixtures through the email signup and password-grant
endpoints. That is a test harness, not a product surface.

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
