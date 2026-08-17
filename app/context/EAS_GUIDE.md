# EAS Build & Update Guide — WowTodo

Quick reference for building the app and pushing OTA updates.

---

## First-Time Setup

### 1. Build the development app

```bash
eas build --profile development --platform android
```

- Takes ~10-15 minutes (builds on Expo's cloud servers)
- Once done, go to **https://expo.dev** → your project → Builds
- Download the `.apk` and install it on your phone
- This app has the dev tools menu (shake to open) and listens for updates on the `dev` channel

### 2. Start the dev server (for local development with hot reload)

```bash
npx expo start --dev-client
```

- Scan the QR code with your phone to connect
- This gives you **live hot reload** during development — changes appear instantly
- This is your day-to-day development workflow

---

## Pushing an OTA Update (JS-only changes)

Use this when you've made changes to your TypeScript/JavaScript code, styles, assets, etc. and want them on your phone **without rebuilding**.

```bash
eas update --channel dev --message "describe what changed"
```

**Examples:**

```bash
eas update --channel dev --message "fix task card styling"
eas update --channel dev --message "add branch selection UI"
eas update --channel dev --message "update AI prompt for better results"
```

**After pushing:**
- Close and reopen the app on your phone
- The app downloads the new JS bundle on launch
- Your changes are live

**What can be updated via OTA:**
- All TypeScript/JavaScript code
- Styles and layout changes
- Images and assets in the JS bundle
- Navigation changes
- API calls and business logic

---

## When You Need a Full Rebuild

You need a new build when **native code changes**. This happens when you:

- Add/remove/update an Expo plugin (e.g., `expo-camera`, `expo-location`)
- Add/remove a native library
- Change `app.json` fields that affect native config (permissions, package name, scheme)
- Update the Expo SDK version
- Change anything in `ios/` or `android/` folders

### Rebuild command

```bash
eas build --profile development --platform android
```

After the build completes:
1. Download the new `.apk` from expo.dev
2. Install it on your phone (replaces the old one)
3. All future `eas update --channel dev` commands will work with this new build

---

## How Updates Work (Under the Hood)

```
┌─────────────────────────────────────────────────────┐
│                    Your Phone                        │
│                                                      │
│   Installed APK (build)                              │
│   ├── Native code (React Native, Expo modules)       │
│   ├── Runtime version: "1.0.0"                       │
│   └── Channel: "dev"                                 │
│                                                      │
│   On app launch:                                     │
│   1. App checks: expo.dev/updates for channel "dev"  │
│   2. If new update found → downloads new JS bundle   │
│   3. Next launch → runs the new JS bundle            │
└─────────────────────────────────────────────────────┘
```

- **Runtime version** = your `version` in app.json (currently `"1.0.0"`)
- Updates are only applied if the runtime version matches
- If you bump the version in app.json AND rebuild, old updates won't apply to the new build (this is a safety feature)

---

## Build Profiles Cheat Sheet

| Profile       | Command                                              | Use Case                          | Output  |
|---------------|------------------------------------------------------|-----------------------------------|---------|
| `development` | `eas build --profile development --platform android` | Dev testing with dev tools menu   | `.apk`  |
| `preview`     | `eas build --profile preview --platform android`     | Sharing with testers (no dev menu)| `.apk`  |
| `production`  | `eas build --profile production --platform android`  | Play Store release                | `.aab`  |

Each profile has its own **channel**, so updates are isolated:

```bash
# Push to dev builds only
eas update --channel dev --message "fix bug"

# Push to preview/tester builds only
eas update --channel preview --message "fix bug"

# Push to production/store builds only
eas update --channel production --message "fix bug"
```

---

## Quick Copy-Paste Commands

```bash
# === DAILY DEVELOPMENT (hot reload) ===
npx expo start --dev-client

# === PUSH OTA UPDATE (no rebuild needed) ===
eas update --channel dev --message "your message here"

# === FULL REBUILD (native changes) ===
eas build --profile development --platform android

# === CHECK UPDATE HISTORY ===
eas update:list

# === CHECK BUILD STATUS ===
eas build:list
```

---

## Troubleshooting

**App not picking up updates?**
- Make sure you fully close and reopen the app (not just background it)
- Check that the build's channel matches the update channel (`dev`)
- Run `eas update:list` to verify the update was published

**"No compatible update found"?**
- The runtime version in the build doesn't match the update
- You likely need a full rebuild: `eas build --profile development --platform android`

**Build failing?**
- Check build logs on expo.dev
- Make sure your `app.json` is valid: `npx expo config`
- Ensure all environment variables are set in your `.env`
