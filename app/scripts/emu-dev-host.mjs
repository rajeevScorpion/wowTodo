#!/usr/bin/env node
/**
 * Point the Android emulator's dev client at Metro over loopback.
 *
 * THE PROBLEM
 * React Native picks the dev server host in PackagerConnectionSettings:
 *
 *   node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/
 *     packagerconnection/PackagerConnectionSettings.kt
 *
 *   get() {
 *     val hostFromSettings = preferences.getString("debug_http_host", null)
 *     if (!hostFromSettings.isNullOrEmpty()) return hostFromSettings
 *     return AndroidInfoHelpers.getServerHost(appContext)   // 10.0.2.2 on an emulator
 *   }
 *
 * On an emulator that fallback is 10.0.2.2 — the emulator's NAT gateway. That NAT
 * corrupts the large chunked multipart dev bundle, and the transfer dies with:
 *
 *   ProtocolException: Expected leading [0-9a-fA-F] character but was 0x2d
 *     at Http1ExchangeCodec$ChunkedSource.readChunkSize
 *     at MultipartStreamReader.readAllParts
 *
 * 0x2d is '-', the first byte of a multipart boundary turning up where a chunk-size
 * header belongs. The bundle never finishes downloading, so the JS context never
 * initialises: splash, then a permanently blank white screen with NO red box and NO
 * `ReactNativeJS` log lines. Metro looks healthy the whole time and reports
 * "Android Bundled" — because Metro BUILT the bundle fine; only the transfer failed.
 *
 * THE FIX
 * Set that preference to localhost and forward the port with `adb reverse`, which is
 * a raw TCP relay and never touches the payload.
 *
 * Things that do NOT fix it, all verified the hard way: restarting Metro,
 * `expo start --clear`, `expo start --localhost`, the expo-development-client deep
 * link, `adb shell pm clear`, rebooting the emulator, and `expo run:android` (which
 * re-bakes 10.0.2.2 anyway).
 *
 * Re-run after `adb kill-server`, an emulator reboot, or reinstalling the app —
 * `adb reverse` and app preferences do not survive any of those.
 */
import { execFileSync } from 'node:child_process';

const PACKAGE = 'com.wowtodo.app';
const PORT = process.env.RCT_METRO_PORT || '8081';
const HOST = `localhost:${PORT}`;
const PREFS = `shared_prefs/${PACKAGE}_preferences.xml`;

function adb(args, opts = {}) {
    return execFileSync('adb', args, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        ...opts,
    });
}

try {
    adb(['get-state']);
} catch {
    console.error('✖ No device/emulator reachable. Is the emulator running, and is');
    console.error('  ANDROID_HOME/platform-tools on PATH? (see docs/engineering/WINDOWS_SETUP.md)');
    process.exit(1);
}

// 1. Forward Metro's port. Bypasses the NAT entirely.
adb(['reverse', `tcp:${PORT}`, `tcp:${PORT}`]);
console.log(`✔ adb reverse tcp:${PORT} → host ${PORT}`);

// 2. Pin the dev server host. RN reads this before falling back to 10.0.2.2.
//    Written through run-as, which works because the dev build is debuggable.
//    Any other keys in this file are dev-only and safe to replace; the app has
//    never been observed to store anything else here.
const xml = `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="debug_http_host">${HOST}</string>
</map>
`;

try {
    adb(['shell', `run-as ${PACKAGE} sh -c 'cat > ${PREFS}'`], { input: xml });
} catch (err) {
    console.error(`✖ Could not write ${PREFS}.`);
    console.error('  run-as only works on a debuggable (dev-client) build — a release');
    console.error('  or EAS build will refuse it, and does not need this anyway because');
    console.error('  its JS bundle is embedded rather than downloaded from Metro.');
    console.error(String(err.stderr || err.message).trim());
    process.exit(1);
}

const readBack = adb(['shell', `run-as ${PACKAGE} cat ${PREFS}`]);
if (!readBack.includes(`>${HOST}<`)) {
    console.error('✖ Preference did not stick. Read back:\n' + readBack);
    process.exit(1);
}
console.log(`✔ debug_http_host = ${HOST}`);

// 3. Restart so the new host is picked up on the next bundle fetch.
adb(['shell', 'am', 'force-stop', PACKAGE]);
adb(['shell', 'monkey', '-p', PACKAGE, '-c', 'android.intent.category.LAUNCHER', '1']);
console.log('✔ app restarted\n');
console.log('Verify with:  adb logcat -d | grep -E "Loading from|ProtocolException"');
console.log('Expect:       "Loading from localhost:' + PORT + '" and no ProtocolException.');
