#!/usr/bin/env node
/**
 * Voice / AI evaluation harness.
 *
 * Replicates src/services/ai/openai.ts exactly: same model, temperature,
 * response_format, system prompt and [LANGUAGE]/[CURRENT DATE] user message.
 * Sends synthetic utterances only. Read-only w.r.t. the app and the database.
 *
 *   npm run eval:voice                  # legacy single-prompt path (the baseline)
 *   npm run eval:voice -- --only=V11,V12
 *
 * Results are compared against docs/testing/VOICE_EVALUATION_BASELINE.md. V01–V18
 * and BASELINE_NOW are FROZEN — changing an utterance or the pinned date silently
 * invalidates every historical comparison. Add new cases; never edit old ones.
 *
 * Originally written for prompt 160 as a run-and-read-the-output script; the
 * scoring below was done by hand into the baseline document. It is automated here
 * because the agentic work (prompt 210) needs a *repeatable* verdict, not a
 * judgement call, to prove each phase is an improvement.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const ARGS = process.argv.slice(2);
const arg = (name) => ARGS.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const TARGET = arg('target') ?? 'legacy';
const ONLY = arg('only')?.split(',').map((s) => s.trim().toUpperCase());

const APP = process.cwd();
const PROXY = 'http://127.0.0.1:55321/functions/v1/ai-proxy';
const AUTHURL = 'http://127.0.0.1:55321/auth/v1';

// Same cache as scripts/verify-*.mjs — `supabase status -o env` is authoritative
// but slow. Resolve it here rather than assuming another script has already run;
// the file is gitignored and holds only the public anon key.
const ANON = (() => {
  if (fs.existsSync('.anonkey')) return fs.readFileSync('.anonkey', 'utf8').trim();
  const out = execSync('npx supabase status -o env', { encoding: 'utf8' });
  const anon = (out.match(/ANON_KEY="([^"]+)"/) || [])[1];
  if (!anon) throw new Error('Could not read the local anon key — is `supabase start` running?');
  fs.writeFileSync('.anonkey', anon, 'utf8');
  return anon;
})();

// Extract the real system prompt from source — no copy that could drift.
const src = fs.readFileSync(`${APP}/src/services/ai/prompt.ts`, 'utf8');
const SYSTEM = src.slice(src.indexOf('`') + 1, src.lastIndexOf('`'));
if (SYSTEM.length < 3000) throw new Error('system prompt extraction failed: ' + SYSTEM.length);

// ── Dataset ─────────────────────────────────────────────────────────────────
// V01–V18: the frozen prompt-160 baseline set. Do not edit.
// V19+:    specialist-domain cases added for the agentic work (prompt 210).
const DATASET = [
  { id:'V01', lang:'en', cat:'Single direct task',        u:'Call the dentist to book a cleaning',                                        expect:{count:[1,4], noTime:true} },
  { id:'V02', lang:'en', cat:'Two independent tasks',      u:'Buy milk and also renew my car insurance',                                   expect:{count:[2,6]} },
  { id:'V03', lang:'en', cat:'Three or more tasks',        u:'I need to book flights, reserve a hotel, get travel insurance and pack',      expect:{count:[4,10]} },
  { id:'V04', lang:'en', cat:'Relative time',              u:'Remind me to submit the tax form next Monday',                                expect:{count:[1,5], wantsDate:true, expectDate:'2026-08-24'} },
  { id:'V05', lang:'en', cat:'Explicit time',              u:'Dinner party this Saturday at 7pm, need to plan it',                          expect:{count:[3,15], wantsEventTime:true, expectDate:'2026-08-22'} },
  { id:'V06', lang:'en', cat:'Sequencing/dependency',      u:'First defrost the chicken, after that marinate it, and once done grill it',   expect:{count:[3,6], ordered:['defrost','marinat','grill']} },
  { id:'V07', lang:'en', cat:'Named person/assignee',      u:'Ask Priya to send the budget sheet and tell Rahul to review it',              expect:{count:[2,6], wantsNames:['Priya','Rahul']} },
  { id:'V08', lang:'en', cat:'Priority/urgency',           u:'Urgent: pay the electricity bill today before it gets cut',                   expect:{count:[1,5], wantsDate:true, expectDate:'2026-08-17'} },
  { id:'V09', lang:'en', cat:'Correction within utterance',u:'Book a table for six people, no wait, make it eight people on Friday',        expect:{count:[1,5], mustContain:'eight', mustNotContain:'six', expectDate:'2026-08-21'} },
  { id:'V10', lang:'en', cat:'Conversational filler',      u:'Um so yeah I was thinking like maybe I should you know clean the garage',     expect:{count:[3,10], mustNotContain:'um'} },
  { id:'V11', lang:'en', cat:'Ambiguous — should clarify', u:'Sort out the thing for the place',                                            expect:{shouldClarify:true} },
  { id:'V12', lang:'en', cat:'Non-task speech',            u:'The weather is really nice today and I feel happy',                           expect:{shouldClarify:true} },
  { id:'V13', lang:'en', cat:'Duplicate instruction',      u:'Buy eggs. Buy eggs. Also buy eggs and bread',                                 expect:{count:[1,3], noDupes:true} },
  { id:'V14', lang:'en', cat:'Long multi-sentence',        u:'I am moving flats next month so I need to find a packers and movers service, sort out the deposit with my current landlord, update my address with the bank and the post office, cancel the internet connection, book a cleaner for the old flat, and buy new curtains for the new place.', expect:{count:[6,15]} },
  { id:'V15', lang:'hi', cat:'Hindi',                      u:'कल सुबह दूध और सब्ज़ी लानी है और बिजली का बिल भरना है',                            expect:{count:[2,6], wantsDevanagari:true, expectDate:'2026-08-18'} },
  { id:'V16', lang:'hi', cat:'Code-switch, Hindi tag',     u:'Kal office ke liye presentation ready karna hai aur Priya ko call karna hai',  expect:{count:[2,6], wantsDevanagari:true} },
  { id:'V17', lang:'en', cat:'Code-switch, English tag',   u:'Kal subah doodh lana hai aur mummy ko call karna hai',                         expect:{count:[2,6], wantsLatinOnly:true} },
  { id:'V18', lang:'en', cat:'Imperfect transcription',    u:'by grocery for the wek and cal the plumber tomorow',                           expect:{count:[2,6], mustContain:'plumber'} },

  // ── Specialist-domain cases (prompt 210) ──────────────────────────────────
  // These probe the depth a single shared prompt cannot carry. `agent` is scored
  // only when --target=agent; under the legacy path it reports n/a.
  { id:'V19', lang:'en', cat:'Recipe — needs quantities',  u:'I want to make chicken biryani for six people this Sunday',                    expect:{count:[6,20], agent:'recipe', wantsQuantities:true, expectDate:'2026-08-23'} },
  { id:'V20', lang:'en', cat:'Trip — multi-leg',           u:'Planning a five day trip to Goa next month, need flights, a hotel, and a sightseeing plan', expect:{count:[6,18], agent:'trip'} },
  { id:'V21', lang:'en', cat:'Schedule — time-blocked day',u:'Plan my day tomorrow: gym in the morning, three client calls, and finish the quarterly report', expect:{count:[4,12], agent:'schedule', wantsDate:true, expectDate:'2026-08-18'} },
  { id:'V22', lang:'en', cat:'Shopping — flat list',       u:'Grocery list for the week: milk, bread, eggs, vegetables and some fruit',      expect:{count:[4,12], agent:'shopping', noTime:true} },
  { id:'V23', lang:'en', cat:'Project — milestones',       u:'I need to launch the new company website by the end of September',            expect:{count:[5,15], agent:'project'} },
  { id:'V24', lang:'hi', cat:'Recipe in Hindi',            u:'रविवार को घर पर पनीर बटर मसाला बनाना है, चार लोगों के लिए',                        expect:{count:[5,20], agent:'recipe', wantsDevanagari:true} },
  { id:'V25', lang:'en', cat:'Ambiguous with a hint',      u:'I should do something for mom',                                                expect:{shouldClarify:true} },
];

const CASES = ONLY ? DATASET.filter((t) => ONLY.includes(t.id)) : DATASET;
if (!CASES.length) throw new Error(`--only matched no cases: ${ONLY?.join(',')}`);

// ── Auth ────────────────────────────────────────────────────────────────────
// Self-provisioning: the eval user is a fixture, and `db:reset:local` or the
// account-deletion suite will happily wipe it. A harness that cannot run because
// of that is a harness nobody runs.
const EVAL_USER = 'demo@wowtodo.local';
const EVAL_PASS = 'T150pass!234';

async function grant() {
  const r = await fetch(`${AUTHURL}/token?grant_type=password`, {
    method:'POST', headers:{apikey:ANON,'Content-Type':'application/json'},
    body: JSON.stringify({email:EVAL_USER, password:EVAL_PASS}) });
  return (await r.json()).access_token ?? null;
}

async function token() {
  let t = await grant();
  if (t) return t;
  await fetch(`${AUTHURL}/signup`, {
    method:'POST', headers:{apikey:ANON,'Content-Type':'application/json'},
    body: JSON.stringify({email:EVAL_USER, password:EVAL_PASS}) });
  t = await grant();
  if (!t) throw new Error(`could not authenticate ${EVAL_USER} — is the local stack up?`);
  console.log(`  (provisioned eval user ${EVAL_USER})`);
  return t;
}

// ── Pacing ──────────────────────────────────────────────────────────────────
// ai-proxy enforces 15 chat requests per 60s per user (migration 0015, defect F3).
// The baseline predates that limit; run unpaced today and the tail of the set is
// scored as failures that are really 429s. Stay just under the burst window, and
// honour Retry-After if we still hit it.
const MIN_GAP_MS = 4_200;
let lastStart = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait for the next allowed request slot. Called by the loop **outside** the
 * timed region — folding this sleep into the measurement would add ~4.2s to every
 * reported latency and quietly invalidate the comparison against the baseline's
 * p50 of 2.6s.
 */
async function awaitSlot() {
  const wait = lastStart + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastStart = Date.now();
}

/**
 * One retry for the two failures that are about the network rather than the
 * pipeline: a 429 from our own limiter, and a transient upstream fault.
 *
 * The second is not hypothetical — a run of this harness hit
 * `received corrupt message of type InvalidContentType` on a TLS connect to
 * api.openai.com, which scored as a pipeline error and would have read as a
 * regression against the baseline's 0/18. A transient blip is not a finding;
 * a reproducible one still fails, because the retry fails too.
 */
async function paced(fn) {
  let res;
  try {
    res = await fn();
  } catch (e) {
    console.log(`  (request failed: ${String(e.message || e).slice(0, 60)} — one retry)`);
    await awaitSlot();
    return fn();
  }

  if (res.status === 429) {
    const after = Number(res.headers.get('Retry-After')) || 60;
    console.log(`  (rate limited — waiting ${after}s)`);
    await sleep((after + 1) * 1000);
    await awaitSlot();
    res = await fn();
  } else if (res.status >= 500) {
    console.log(`  (upstream ${res.status} — one retry)`);
    await awaitSlot();
    res = await fn();
  }

  return res;
}

// ── Prompt construction — mirrors src/services/ai/dateContext.ts ────────────
// Pinned to a fixed date so results stay comparable against the baseline document.
const BASELINE_NOW = new Date('2026-08-17T10:00:00');
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const isoLocal = (d) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (b, n) => { const d = new Date(b); d.setDate(d.getDate() + n); return d; };

function buildDateContext(now = BASELINE_NOW) {
    const today = isoLocal(now), todayName = WEEKDAYS[now.getDay()], tm = addDays(now, 1);
    const lines = [
        `[CURRENT DATE: ${today} (${todayName})]`, '',
        '[DATE REFERENCE — already calculated. Use these exact dates; do not work them',
        'out yourself. "this <day>" and "next <day>" both mean the next occurrence below.]',
        `today = ${today} (${todayName})`,
        `tomorrow = ${isoLocal(tm)} (${WEEKDAYS[tm.getDay()]})`,
    ];
    for (let o = 1; o <= 7; o++) { const d = addDays(now, o); lines.push(`${WEEKDAYS[d.getDay()]} = ${isoLocal(d)}`); }
    return lines.join('\n');
}

function userMessage(u, lang) {
  let m = `[LANGUAGE: ${lang === 'hi' ? 'Hindi' : 'English'}]\n\n`;
  m += `${buildDateContext()}\n\n`;
  m += u;
  m += `\n\nExisting groups: [Cooking, Work, Home]`;
  return m;
}

// ── Runners ─────────────────────────────────────────────────────────────────
async function runLegacy(t, tok) {
  const r = await paced(() => fetch(PROXY, {
    method:'POST',
    headers:{apikey:ANON, Authorization:`Bearer ${tok}`, 'Content-Type':'application/json'},
    body: JSON.stringify({ target:'openai-chat', body:{
      model:'gpt-4o-mini', temperature:0.3, response_format:{type:'json_object'},
      messages:[{role:'system',content:SYSTEM},{role:'user',content:userMessage(t.u,t.lang)}] }})
  }));
  const body = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(body).slice(0,200)}`);
  return JSON.parse(body.choices?.[0]?.message?.content ?? 'null');
}

// --target=agent is wired in Phase 1, when ai-agent exists and its event protocol
// is settled. Deliberately absent rather than stubbed: a runner that has never
// executed would report scores nobody can trust.
const RUNNERS = { legacy: runLegacy };
if (!RUNNERS[TARGET]) {
  throw new Error(`unknown --target=${TARGET} (available: ${Object.keys(RUNNERS).join(', ')})`);
}

// ── Scoring ─────────────────────────────────────────────────────────────────
// Each predicate returns true (pass), false (fail) or null (not applicable).
const DEVANAGARI = /[ऀ-ॿ]/;
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
const word = (hay, w) => new RegExp(`\\b${w}\\b`, 'i').test(hay);

function scoreCase(t, out) {
  const e = t.expect ?? {};
  const todos = Array.isArray(out?.todos) ? out.todos : [];
  const titles = todos.map((x) => (typeof x === 'string' ? x : x?.title));
  const blob = JSON.stringify(out ?? {});
  const dates = [
    out?.event_time ? String(out.event_time).slice(0, 10) : null,
    ...todos.map((x) => (typeof x === 'object' ? x?.due_date : null)),
  ].filter(Boolean);

  const s = {};

  // Structural validity — the one dimension every case is scored on.
  s.valid = !!(out && typeof out.title === 'string' && out.title.trim() && todos.length >= 0
    && (out.groups?.selected || out.group));

  s.count = e.count ? todos.length >= e.count[0] && todos.length <= e.count[1] : null;

  s.date = e.expectDate ? dates.includes(e.expectDate) : null;
  s.wantsDate = e.wantsDate ? dates.length > 0 : null;
  s.eventTime = e.wantsEventTime ? !!out?.event_time : null;
  s.noTime = e.noTime
    ? !out?.event_time && todos.every((x) => typeof x !== 'object' || !x?.due_time)
    : null;

  // Clarification vs fabrication. The legacy schema has no field for uncertainty,
  // so this is structurally 0/N there — which is the finding, not a harness bug.
  s.clarify = e.shouldClarify
    ? !!(typeof out?.clarification === 'string' && out.clarification.trim()) || todos.length === 0
    : null;

  s.ordered = e.ordered
    ? (() => {
        const at = e.ordered.map((frag) => titles.findIndex((x) => norm(x).includes(frag)));
        return at.every((i) => i >= 0) && at.every((v, i) => i === 0 || v > at[i - 1]);
      })()
    : null;

  s.entities = e.wantsNames ? e.wantsNames.every((n) => blob.includes(n)) : null;
  s.contains = e.mustContain ? word(blob, e.mustContain) : null;
  s.excludes = e.mustNotContain ? !word(blob, e.mustNotContain) : null;

  s.noDupes = e.noDupes
    ? new Set(titles.map(norm)).size === titles.length
    : null;

  s.language = e.wantsDevanagari ? DEVANAGARI.test(blob)
    : e.wantsLatinOnly ? !DEVANAGARI.test(blob)
    : null;

  // Recipe depth: an ingredient step is useless without an amount.
  s.quantities = e.wantsQuantities
    ? titles.filter((x) => /\d/.test(String(x))).length >= 2
    : null;

  // Routing is only observable on the agentic path.
  s.routing = e.agent ? (out?.agent ? out.agent === e.agent : null) : null;

  return s;
}

const DIMENSIONS = {
  valid:      'structured validity',
  count:      'todo count in range',
  date:       'date accuracy',
  wantsDate:  'date present',
  eventTime:  'event_time present',
  noTime:     'no fabricated time',
  clarify:    'clarifies instead of fabricating',
  ordered:    'ordering preserved',
  entities:   'named entities kept',
  contains:   'required content present',
  excludes:   'corrected content dropped',
  noDupes:    'deduplicated',
  language:   'language/script compliance',
  quantities: 'quantities included',
  routing:    'routed to the right agent',
};

// ── Run ─────────────────────────────────────────────────────────────────────
const TOK = await token();
const results = [];

console.log(`\ntarget=${TARGET}  cases=${CASES.length}  paced at ${MIN_GAP_MS}ms\n`);

for (const t of CASES) {
  await awaitSlot();          // outside the timer — see awaitSlot()
  const started = Date.now();
  let out = null, err = null;
  try {
    out = await RUNNERS[TARGET](t, TOK);
  } catch (e) { err = String(e.message || e); }
  const ms = Date.now() - started;

  const s = err ? null : scoreCase(t, out);
  const graded = s ? Object.values(s).filter((v) => v !== null) : [];
  const failed = s ? Object.entries(s).filter(([, v]) => v === false).map(([k]) => k) : [];
  const mark = err ? 'ERR' : failed.length === 0 ? ' ✅' : ' ❌';

  results.push({ ...t, ms, out, err, score: s });
  const n = out?.todos?.length ?? '-';
  console.log(
    `${mark} ${t.id} ${String(ms).padStart(5)}ms todos=${String(n).padStart(2)}` +
    ` ${err ? 'ERR ' + err.slice(0, 60) : (out?.title ?? '').slice(0, 42)}` +
    (failed.length ? `   ✗ ${failed.join(', ')}` : '') +
    (graded.length ? '' : '   (nothing scored)'),
  );
}

// ── Scorecard ───────────────────────────────────────────────────────────────
console.log('\n── Scorecard ──');
for (const [key, label] of Object.entries(DIMENSIONS)) {
  const scored = results.filter((r) => r.score && r.score[key] !== null);
  if (!scored.length) continue;
  const ok = scored.filter((r) => r.score[key] === true).length;
  const bar = ok === scored.length ? '✅' : ok === 0 ? '❌' : '⚠️ ';
  console.log(`  ${bar} ${label.padEnd(34)} ${ok}/${scored.length}`);
}

const clean = results.filter((r) => !r.err);
const perfect = clean.filter((r) => Object.values(r.score).every((v) => v !== false));
const lat = results.map((r) => r.ms).sort((a, b) => a - b);

console.log(`\n  cases fully passing            ${perfect.length}/${results.length}`);
console.log(`  pipeline errors                ${results.length - clean.length}/${results.length}`);
console.log(`  latency ms  min=${lat[0]} p50=${lat[Math.floor(lat.length / 2)]} max=${lat[lat.length - 1]}`);

const outFile = `./eval-${TARGET}-results.json`;
fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
console.log(`\n  full output → ${outFile}\n`);

// Exit code reflects pipeline health only, not model quality — a failing case is a
// finding to compare against the baseline, not a broken build.
process.exit(clean.length === results.length ? 0 : 1);
