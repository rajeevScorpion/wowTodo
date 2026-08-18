#!/usr/bin/env node
/**
 * Prove the LOCAL and CLOUD `public` schemas are identical.
 *
 * The two drifted badly once: migrations 0013 and 0014 passed locally and were
 * absent from production for days, which left a P0 live. A green local reset is
 * not evidence about cloud, so this compares them directly.
 *
 * Read-only. Dumps both schemas and compares them after normalising two things
 * that differ between any two dumps but are not schema:
 *   - line endings (the Windows CLI writes CRLF locally, LF over the wire)
 *   - pg_dump's `\restrict` / `\unrestrict` session token, which is random
 *     per invocation
 *
 * Exit 0 = identical, 1 = drift (and the diff is printed).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Node 22 refuses to execFile a .cmd without a shell, so the Windows shim is
// invoked through one. Paths are quoted because the temp directory may contain
// spaces on other machines even though it does not here.
const isWindows = process.platform === 'win32';
const CLI = join('node_modules', '.bin', isWindows ? 'supabase.cmd' : 'supabase');

const work = mkdtempSync(join(tmpdir(), 'wowtodo-schema-'));

function dump(target, file) {
    process.stdout.write(`→ dumping ${target.padEnd(8)} `);
    execFileSync(CLI, ['db', 'dump', target, '-s', 'public', '-f', `"${file}"`], {
        stdio: ['ignore', 'ignore', 'pipe'],
        encoding: 'utf8',
        shell: isWindows,
    });
    console.log('ok');
    return file;
}

/** Strip the two things that legitimately differ between dumps. */
function normalise(file) {
    return readFileSync(file, 'utf8')
        .replace(/\r/g, '')
        .split('\n')
        .filter((line) => !/^\\(un)?restrict /.test(line))
        .join('\n');
}

const localRaw = dump('--local', join(work, 'local.sql'));
const cloudRaw = dump('--linked', join(work, 'cloud.sql'));

const local = normalise(localRaw);
const cloud = normalise(cloudRaw);

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

console.log(`\n  local  ${sha(local)}  ${local.length} bytes`);
console.log(`  cloud  ${sha(cloud)}  ${cloud.length} bytes\n`);

if (local === cloud) {
    console.log('✅ IDENTICAL — local and cloud public schemas match.');
    process.exit(0);
}

// Write both back out so the developer can diff them with their own tools.
const localOut = join(work, 'local.normalised.sql');
const cloudOut = join(work, 'cloud.normalised.sql');
writeFileSync(localOut, local);
writeFileSync(cloudOut, cloud);

console.error('❌ DRIFT — local and cloud public schemas differ.\n');
try {
    execFileSync('git', ['diff', '--no-index', '--', localOut, cloudOut], {
        stdio: 'inherit',
    });
} catch {
    // git diff --no-index exits non-zero when files differ; that is the point.
}
console.error(`\nNormalised dumps kept for inspection:\n  ${localOut}\n  ${cloudOut}`);
console.error('\nIf cloud is behind, run: npm run db:push');
process.exit(1);
