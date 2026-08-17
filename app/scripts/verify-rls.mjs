#!/usr/bin/env node
/**
 * RLS / authorisation regression suite. Local Supabase only.
 *
 * This exists because the class of defect it covers (F1, F5, and anything like
 * them) is invisible to `tsc` and to the jest suite: the code compiles, the unit
 * tests pass, and a share recipient can still seize another user's data. The
 * only way to catch it is to drive the real PostgREST path with two real users.
 *
 * Every check asserts BOTH directions — that the attack is blocked AND that
 * legitimate collaboration still works. A policy that denies everything would
 * pass a one-directional test and break the product.
 *
 *   npm run verify:rls        (requires: supabase start && npm run db:reset:local)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

// Local anon key. `supabase status -o env` is authoritative; cache it to .anonkey
// so repeated runs do not pay the CLI startup cost.
const ANON = (() => {
    if (fs.existsSync('.anonkey')) return fs.readFileSync('.anonkey', 'utf8').trim();
    const out = execSync('npx supabase status -o env', { encoding: 'utf8' });
    const key = (out.match(/ANON_KEY="([^"]+)"/) || [])[1];
    if (!key) throw new Error('Could not read local ANON_KEY — is `supabase start` running?');
    fs.writeFileSync('.anonkey', key, 'utf8');
    return key;
})();
const BASE = 'http://127.0.0.1:55321';
const psql = (sql) => execSync(`docker exec -i supabase_db_wowtodo psql -U postgres -d postgres -tA -c "${sql}"`, { encoding: 'utf8' }).trim();

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? '  — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

async function signup(email) {
  await fetch(`${BASE}/auth/v1/signup`, { method:'POST', headers:{apikey:ANON,'Content-Type':'application/json'},
    body: JSON.stringify({ email, password:'Verify0013!' }) });
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method:'POST',
    headers:{apikey:ANON,'Content-Type':'application/json'}, body: JSON.stringify({ email, password:'Verify0013!' }) });
  const j = await r.json();
  if (!j.access_token) throw new Error('auth failed for ' + email + ': ' + JSON.stringify(j).slice(0,200));
  return j.access_token;
}
const H = (tok) => ({ apikey: ANON, Authorization:`Bearer ${tok}`, 'Content-Type':'application/json' });
const rest = (path, tok, opts={}) => fetch(`${BASE}/rest/v1/${path}`, { headers:H(tok), ...opts });

const OWNER = 'v13owner@wowtodo.local', RECIP = 'v13recip@wowtodo.local';
const tokO = await signup(OWNER), tokR = await signup(RECIP);
const uidO = psql(`select id from auth.users where email='${OWNER}'`);
const uidR = psql(`select id from auth.users where email='${RECIP}'`);

// Profiles so name search has something to match.
psql(`insert into user_profiles (user_id, full_name) values ('${uidO}','Olivia Owner'),('${uidR}','Rex Recipient') on conflict do nothing`);

// Owner's task + todo, shared with and accepted by the recipient.
const task = JSON.parse(await (await rest('tasks', tokO, { method:'POST', headers:{...H(tokO),Prefer:'return=representation'},
  body: JSON.stringify({ user_id: uidO, title:'V13 Owner Task' }) })).text())[0].id;
const todo = JSON.parse(await (await rest('todos', tokO, { method:'POST', headers:{...H(tokO),Prefer:'return=representation'},
  body: JSON.stringify({ task_id: task, user_id: uidO, title:'V13 Original Title', order:0 }) })).text())[0].id;
psql(`insert into shares (task_id,owner_id,recipient_id,recipient_email,status) values ('${task}','${uidO}','${uidR}','${RECIP}','accepted')`);

console.log('\n── F1: share recipient update scope ──');

let r = await rest(`todos?id=eq.${todo}`, tokR, { method:'PATCH', body: JSON.stringify({ completed:true }) });
check('recipient CAN toggle completed (collaboration preserved)', r.status === 204, `HTTP ${r.status}`);

r = await rest(`todos?id=eq.${todo}`, tokR, { method:'PATCH', body: JSON.stringify({ title:'HIJACKED' }) });
check('recipient CANNOT change title', r.status === 403 || r.status === 400, `HTTP ${r.status}`);

r = await rest(`todos?id=eq.${todo}`, tokR, { method:'PATCH', body: JSON.stringify({ user_id: uidR }) });
check('recipient CANNOT seize user_id', r.status === 403 || r.status === 400, `HTTP ${r.status}`);

r = await rest(`todos?id=eq.${todo}`, tokR, { method:'PATCH', body: JSON.stringify({ due_date:'2030-01-01' }) });
check('recipient CANNOT change due_date', r.status === 403 || r.status === 400, `HTTP ${r.status}`);

check('todo still owned by owner, title intact',
  psql(`select user_id||'|'||title from todos where id='${todo}'`) === `${uidO}|V13 Original Title`);

r = await rest(`todos?id=eq.${todo}`, tokO, { method:'PATCH', body: JSON.stringify({ title:'Owner Renamed It' }) });
check('OWNER can still change title', r.status === 204, `HTTP ${r.status}`);
r = await rest(`todos?id=eq.${todo}`, tokO, { method:'PATCH', body: JSON.stringify({ due_date:'2030-06-01' }) });
check('OWNER can still change due_date', r.status === 204, `HTTP ${r.status}`);

check('owner still sees own todo under RLS',
  JSON.parse(await (await rest(`todos?id=eq.${todo}&select=id`, tokO)).text()).length === 1);
check('recipient still SEES the shared todo (read preserved)',
  JSON.parse(await (await rest(`todos?id=eq.${todo}&select=id`, tokR)).text()).length === 1);

console.log('\n── F5: user search ──');
const rpc = async (tok, q) => JSON.parse(await (await fetch(`${BASE}/rest/v1/rpc/search_users`,
  { method:'POST', headers:H(tok), body: JSON.stringify({ search_query:q }) })).text());

check('search "@" returns nothing (no harvest)', (await rpc(tokR,'@')).length === 0);
check('search "com" returns nothing (no harvest)', (await rpc(tokR,'com')).length === 0);
check('search "a" (too short) returns nothing', (await rpc(tokR,'a')).length === 0);

const byEmail = await rpc(tokR, OWNER);
check('exact email finds the user', byEmail.length === 1 && byEmail[0].user_id === uidO);
check('exact email match returns the email', byEmail[0]?.email === OWNER);

const byName = await rpc(tokR, 'Olivia');
check('name search finds the user', byName.length === 1 && byName[0].user_id === uidO);
check('name search does NOT leak email', byName[0]?.email === null, `got ${JSON.stringify(byName[0]?.email)}`);
check('name search still returns display fields', byName[0]?.full_name === 'Olivia Owner');

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'}  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
