#!/usr/bin/env node
/**
 * Reset the LOCAL Supabase database and apply every migration in the order
 * recorded in migrations/MIGRATION_ORDER.md.
 *
 * The SQL filenames carry no sequence, so the order below is authoritative and
 * was derived from git history. Keep it in sync with MIGRATION_ORDER.md.
 *
 * Local only. It discovers the local supabase_db_* container and refuses to run
 * against anything else, so it cannot touch the cloud project.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(APP_DIR, 'migrations');

/** Authoritative order — see migrations/MIGRATION_ORDER.md */
const ORDER = [
    'supabase_schema.sql',
    'supabase_migration_add_task_groups.sql',
    'supabase_migration_add_user_profiles.sql',
    'supabase_migration_reminders.sql',
    'supabase_migration_branches.sql',
    'supabase_migration_sharing.sql',
    'supabase_fix_rls_circular.sql',
    'supabase_fix_search_users.sql',
    'supabase_migration_profiles_email.sql',
    'supabase_migration_sharing_peek.sql',
    'supabase_migration_bugfix_triggers.sql',
    'supabase_migration_get_profiles_by_ids.sql',
];

function sh(cmd, args, opts = {}) {
    return execFileSync(cmd, args, { encoding: 'utf8', ...opts });
}

/** project_id from supabase/config.toml — pins us to THIS project's container. */
function projectId() {
    const toml = readFileSync(join(APP_DIR, 'supabase', 'config.toml'), 'utf8');
    const m = toml.match(/^project_id\s*=\s*"([^"]+)"/m);
    if (!m) {
        console.error('✖ Could not read project_id from supabase/config.toml');
        process.exit(1);
    }
    return m[1];
}

function findLocalDbContainer() {
    // Other Supabase stacks may be running on this machine (e.g. another
    // project). Match this project's container exactly so we can never write to
    // the wrong database.
    const expected = `supabase_db_${projectId()}`;
    const out = sh('docker', ['ps', '--filter', `name=^${expected}$`, '--format', '{{.Names}}']).trim();
    if (!out) {
        console.error(`✖ Container ${expected} is not running. Run \`supabase start\` in app/ first.`);
        process.exit(1);
    }
    return out.split('\n')[0];
}

const container = findLocalDbContainer();
console.log(`→ Local database container: ${container}`);

// Drop and recreate the public schema. auth/storage schemas are left intact so
// Supabase Auth keeps working.
console.log('→ Dropping and recreating schema public');
sh('docker', [
    'exec', '-i', container,
    'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
    '-c', 'drop schema if exists public cascade; create schema public; grant all on schema public to postgres, anon, authenticated, service_role;',
], { stdio: ['ignore', 'inherit', 'inherit'] });

let applied = 0;
for (const file of ORDER) {
    const path = join(MIGRATIONS_DIR, file);
    if (!existsSync(path)) {
        console.error(`✖ Missing migration: ${file}`);
        process.exit(1);
    }
    process.stdout.write(`→ [${String(++applied).padStart(2, '0')}/${ORDER.length}] ${file} ... `);
    try {
        sh('docker', [
            'exec', '-i', container,
            'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q',
        ], { input: readFileSync(path, 'utf8'), stdio: ['pipe', 'pipe', 'pipe'] });
        console.log('ok');
    } catch (err) {
        console.log('FAILED');
        console.error(err.stderr || err.stdout || err.message);
        process.exit(1);
    }
}

console.log(`\n✅ Applied ${applied} migrations to the local database.`);
