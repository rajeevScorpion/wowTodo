#!/usr/bin/env node
/**
 * Account-deletion regression suite (defect D1). Local Supabase only.
 *
 * Google Play requires that deleting an account actually deletes the user's
 * data. The app makes that claim with a single admin delete of the `auth.users`
 * row and relies on `on delete cascade` to reach ten tables. That reliance is
 * invisible to `tsc` and to jest: add a table without the cascade, or with
 * `on delete set null`, and the code still compiles, the unit tests still pass,
 * and the app quietly starts lying to its users and to Play.
 *
 * So this drives the real Edge Function with a real user and asserts BOTH
 * directions — that the deleted user's data is gone, AND that a second user's
 * data survives untouched. A cascade that deleted too much would pass a
 * one-directional test while destroying other people's tasks.
 *
 *   npm run verify:account-deletion   (requires: supabase start && npm run db:reset:local)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:55321';

// Same caching trick as verify-rls.mjs: `supabase status -o env` is
// authoritative but slow, so keep the keys next to the ones it already writes.
const keys = (() => {
    if (fs.existsSync('.anonkey') && fs.existsSync('.servicekey')) {
        return {
            anon: fs.readFileSync('.anonkey', 'utf8').trim(),
            service: fs.readFileSync('.servicekey', 'utf8').trim(),
        };
    }
    const out = execSync('npx supabase status -o env', { encoding: 'utf8' });
    const anon = (out.match(/ANON_KEY="([^"]+)"/) || [])[1];
    const service = (out.match(/SERVICE_ROLE_KEY="([^"]+)"/) || [])[1];
    if (!anon || !service) {
        throw new Error('Could not read local keys — is `supabase start` running?');
    }
    fs.writeFileSync('.anonkey', anon, 'utf8');
    fs.writeFileSync('.servicekey', service, 'utf8');
    return { anon, service };
})();

const ANON = keys.anon;
const psql = (sql) =>
    execSync(`docker exec -i supabase_db_wowtodo psql -U postgres -d postgres -tA -c "${sql}"`, {
        encoding: 'utf8',
    }).trim();

/**
 * Multi-statement SQL, fed over stdin rather than `-c "..."`.
 *
 * The seed script contains double quotes (`"order"` is a reserved word) and
 * newlines, and passing that through `-c` on Windows loses to shell quoting —
 * psql then silently runs a mangled script and exits 0, so the fixtures are
 * empty and every later assertion fails for the wrong reason. ON_ERROR_STOP
 * makes any failure loud instead.
 */
const psqlScript = (sql) =>
    execSync('docker exec -i supabase_db_wowtodo psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q', {
        encoding: 'utf8',
        input: sql,
    });

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
    console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? '  — ' + detail : ''}`);
    ok ? pass++ : fail++;
};

async function signup(email) {
    await fetch(`${BASE}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'VerifyD1Delete!' }),
    });
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'VerifyD1Delete!' }),
    });
    const j = await r.json();
    if (!j.access_token) {
        throw new Error(`auth failed for ${email}: ${JSON.stringify(j).slice(0, 200)}`);
    }
    return j.access_token;
}

const callDelete = (token, body) =>
    fetch(`${BASE}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
            apikey: ANON,
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });

// ── Fixtures ────────────────────────────────────────────────────────────────
// VICTIM is deleted. BYSTANDER must survive, including the rows that reference
// the victim — that half is what proves the cascade is scoped correctly.
const VICTIM = 'd1victim@wowtodo.local';
const BYSTANDER = 'd1bystander@wowtodo.local';

// Start from a clean slate. The victim is deleted by the run itself, but the
// bystander survives by design, and their fixed-UUID fixtures would collide on
// the next run. Deleting the auth rows also re-exercises the cascade.
psqlScript(`delete from auth.users where email in ('${VICTIM}', '${BYSTANDER}');`);

const tokV = await signup(VICTIM);
await signup(BYSTANDER);
const uidV = psql(`select id from auth.users where email='${VICTIM}'`);
const uidB = psql(`select id from auth.users where email='${BYSTANDER}'`);

// One row in every table that stores user data, for both users.
psqlScript(`
  insert into user_profiles (user_id, full_name) values ('${uidV}','Vic Tim'),('${uidB}','By Stander');
  insert into task_groups (id, user_id, name) values
    ('11111111-0000-0000-0000-000000000001','${uidV}','Victim Group'),
    ('11111111-0000-0000-0000-000000000002','${uidB}','Bystander Group');
  insert into tasks (id, user_id, title) values
    ('22222222-0000-0000-0000-000000000001','${uidV}','Victim Task'),
    ('22222222-0000-0000-0000-000000000002','${uidB}','Bystander Task');
  insert into todos (id, task_id, user_id, title, "order") values
    ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','${uidV}','Victim Todo',0),
    ('33333333-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002','${uidB}','Bystander Todo',0);
  insert into reminder_settings (user_id, group_id) values
    ('${uidV}','11111111-0000-0000-0000-000000000001'),
    ('${uidB}','11111111-0000-0000-0000-000000000002');
  insert into scheduled_reminders (user_id, todo_id, slot_number, fire_at, type) values
    ('${uidV}','33333333-0000-0000-0000-000000000001',1,now()+interval '1 day','notification'),
    ('${uidB}','33333333-0000-0000-0000-000000000002',1,now()+interval '1 day','notification');
  insert into ai_usage_quota (user_id, kind, window_seconds, request_count) values
    ('${uidV}','chat',60,3),('${uidB}','chat',60,3);
  -- 0017. Metrics rows, correlated to each user's own task.
  insert into ai_runs (user_id, kind, agent, outcome, task_id) values
    ('${uidV}','task','recipe','ok','22222222-0000-0000-0000-000000000001'),
    ('${uidB}','task','trip','ok','22222222-0000-0000-0000-000000000002');
  -- Shares in BOTH directions: the victim as owner, and as recipient.
  insert into shares (task_id, owner_id, recipient_id, status) values
    ('22222222-0000-0000-0000-000000000001','${uidV}','${uidB}','accepted'),
    ('22222222-0000-0000-0000-000000000002','${uidB}','${uidV}','pending');
  -- A notification the BYSTANDER owns, but which the victim caused.
  insert into in_app_notifications (id, user_id, type, actor_id, body) values
    ('44444444-0000-0000-0000-000000000001','${uidB}','share_received','${uidV}','Vic Tim shared a task');
  insert into in_app_notifications (user_id, type, actor_id, body) values
    ('${uidV}','share_accepted','${uidB}','By Stander accepted');
`);

// Every table that must be emptied, with the column naming the owner.
const OWNED = [
    ['user_profiles', 'user_id'],
    ['task_groups', 'user_id'],
    ['tasks', 'user_id'],
    ['todos', 'user_id'],
    ['reminder_settings', 'user_id'],
    ['scheduled_reminders', 'user_id'],
    ['ai_usage_quota', 'user_id'],
    ['ai_runs', 'user_id'],
    ['shares', 'owner_id'],
    ['shares', 'recipient_id'],
    ['in_app_notifications', 'user_id'],
];

const countFor = (table, column, uid) =>
    Number(psql(`select count(*) from ${table} where ${column}='${uid}'`));

const totalRows = (table) => Number(psql(`select count(*) from ${table}`));

/**
 * Which rows in each table are the victim's, and must therefore disappear.
 *
 * This exists because counting `where user_id = '<victim>'` cannot tell deletion
 * apart from `ON DELETE SET NULL`: under SET NULL the row survives with the column
 * nulled, the count is still 0, and the assertion passes while the data is still
 * sitting in the database. Verified by mutation — flipping ai_runs to SET NULL did
 * not fail the suite until this was added.
 *
 * A NOT NULL column happens to be immune (the delete errors out instead), but that
 * is a property of today's schema, not a guarantee about the next table someone
 * adds. Comparing total row counts before and after catches it either way.
 *
 * `shares` needs an OR: the victim owns one row and receives another, so per-column
 * arithmetic would double-count the pair.
 */
const DELETED_BY = {
    user_profiles:        `user_id='${uidV}'`,
    task_groups:          `user_id='${uidV}'`,
    tasks:                `user_id='${uidV}'`,
    todos:                `user_id='${uidV}'`,
    reminder_settings:    `user_id='${uidV}'`,
    scheduled_reminders:  `user_id='${uidV}'`,
    ai_usage_quota:       `user_id='${uidV}'`,
    ai_runs:              `user_id='${uidV}'`,
    shares:               `owner_id='${uidV}' or recipient_id='${uidV}'`,

    // in_app_notifications reaches the victim by FOUR routes, not one:
    //   user_id  CASCADE   their own inbox
    //   share_id CASCADE   a row in SOMEONE ELSE'S inbox, about the victim's share
    //   task_id  CASCADE   likewise, about the victim's task
    //   actor_id SET NULL  the documented exception — row survives, link severed
    //
    // The two middle routes are second-order and were not in the documented model;
    // this check is what surfaced them (the table lost 3 rows where the naive
    // `user_id` predicate predicted 2). The behaviour is right — a "Vic shared
    // 'Dinner Party' with you" notification whose share and task are both gone
    // deep-links to nothing — but the arithmetic has to say so out loud.
    in_app_notifications:
        `user_id='${uidV}'` +
        ` or share_id in (select id from shares where owner_id='${uidV}' or recipient_id='${uidV}')` +
        ` or task_id in (select id from tasks where user_id='${uidV}')`,
};

// Snapshot before anything is deleted, so the arithmetic below has a reference.
const before = Object.fromEntries(
    Object.entries(DELETED_BY).map(([t, pred]) => [
        t,
        { total: totalRows(t), victim: Number(psql(`select count(*) from ${t} where ${pred}`)) },
    ]),
);

console.log('\n── Fixtures ──');
const seeded = OWNED.every(([t, c]) => countFor(t, c, uidV) > 0);
check('victim has data in all eleven owner columns', seeded);

console.log('\n── Refusals (nothing may be deleted) ──');

let r = await callDelete(null, { confirm: 'DELETE_MY_ACCOUNT' });
check('unauthenticated call is rejected', r.status === 401, `HTTP ${r.status}`);

r = await callDelete(tokV, {});
check('missing confirmation is rejected', r.status === 400, `HTTP ${r.status}`);

r = await callDelete(tokV, { confirm: 'delete' });
check('wrong confirmation is rejected', r.status === 400, `HTTP ${r.status}`);

r = await fetch(`${BASE}/functions/v1/delete-account`, {
    method: 'GET',
    headers: { apikey: ANON, Authorization: `Bearer ${tokV}` },
});
check('GET is rejected', r.status === 405 || r.status === 401, `HTTP ${r.status}`);

check('victim still exists after every refusal',
    psql(`select count(*) from auth.users where id='${uidV}'`) === '1');

console.log('\n── Deletion ──');

r = await callDelete(tokV, { confirm: 'DELETE_MY_ACCOUNT' });
const body = await r.text();
check('delete-account returns 200', r.status === 200, `HTTP ${r.status} ${body.slice(0, 160)}`);

check('auth user is gone', psql(`select count(*) from auth.users where id='${uidV}'`) === '0');
check('auth identity is gone', psql(`select count(*) from auth.identities where user_id='${uidV}'`) === '0');

console.log('\n── Cascade: every table emptied ──');
for (const [table, column] of OWNED) {
    const n = countFor(table, column, uidV);
    check(`${table}.${column}`, n === 0, `${n} row(s) left`);
}

console.log('\n── Cascade: rows are DELETED, not orphaned ──');
// The check above is satisfied by a nulled column as much as by a deleted row.
// This one is not: if the row survived, the total did not drop.
for (const [table, { total, victim }] of Object.entries(before)) {
    const now = totalRows(table);
    const expected = total - victim;
    check(
        `${table} lost exactly its ${victim} victim row(s)`,
        now === expected,
        `${total} → ${now}, expected ${expected}`,
    );
}

console.log('\n── Bystander is untouched ──');
for (const [table, column] of OWNED) {
    // The bystander's two shares both referenced the victim, so those rows are
    // legitimately gone; everything else must survive.
    if (table === 'shares') continue;
    check(`${table}.${column} survives`, countFor(table, column, uidB) > 0);
}
check('bystander task intact',
    psql(`select title from tasks where user_id='${uidB}'`) === 'Bystander Task');
check('bystander todo intact',
    psql(`select title from todos where user_id='${uidB}'`) === 'Bystander Todo');
check('bystander account still signs in',
    (await signup(BYSTANDER)).length > 0);

console.log('\n── The one deliberate exception ──');
// actor_id is `on delete set null`: the row belongs to the bystander's inbox, so
// deleting it would erase someone else's data. The link is severed instead.
const actor = psql(
    `select coalesce(actor_id::text,'NULL') from in_app_notifications where id='44444444-0000-0000-0000-000000000001'`,
);
check("bystander's notification survives with actor_id nulled", actor === 'NULL', actor);

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
