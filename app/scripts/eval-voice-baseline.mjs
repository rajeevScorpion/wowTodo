// Prompt 160 — voice/AI evaluation baseline.
// Replicates src/services/ai/openai.ts exactly: same model, temperature,
// response_format, system prompt and [LANGUAGE]/[CURRENT DATE] user message.
// Sends synthetic utterances only. Read-only w.r.t. the app and the database.
import fs from 'node:fs';

const APP = process.cwd();
const PROXY = 'http://127.0.0.1:55321/functions/v1/ai-proxy';
const AUTHURL = 'http://127.0.0.1:55321/auth/v1';
const ANON = fs.readFileSync('./.anonkey', 'utf8').trim();

// Extract the real system prompt from source — no copy that could drift.
const src = fs.readFileSync(`${APP}/src/services/ai/prompt.ts`, 'utf8');
const SYSTEM = src.slice(src.indexOf('`') + 1, src.lastIndexOf('`'));
if (SYSTEM.length < 3000) throw new Error('system prompt extraction failed: ' + SYSTEM.length);

const DATASET = [
  { id:'V01', lang:'en', cat:'Single direct task',        u:'Call the dentist to book a cleaning',                                        expect:{count:[1,4], noTime:true} },
  { id:'V02', lang:'en', cat:'Two independent tasks',      u:'Buy milk and also renew my car insurance',                                   expect:{count:[2,6]} },
  { id:'V03', lang:'en', cat:'Three or more tasks',        u:'I need to book flights, reserve a hotel, get travel insurance and pack',      expect:{count:[4,10]} },
  { id:'V04', lang:'en', cat:'Relative time',              u:'Remind me to submit the tax form next Monday',                                expect:{count:[1,5], wantsDate:true} },
  { id:'V05', lang:'en', cat:'Explicit time',              u:'Dinner party this Saturday at 7pm, need to plan it',                          expect:{count:[3,15], wantsEventTime:true} },
  { id:'V06', lang:'en', cat:'Sequencing/dependency',      u:'First defrost the chicken, after that marinate it, and once done grill it',   expect:{count:[3,6], ordered:['defrost','marinat','grill']} },
  { id:'V07', lang:'en', cat:'Named person/assignee',      u:'Ask Priya to send the budget sheet and tell Rahul to review it',              expect:{count:[2,6], wantsNames:['Priya','Rahul']} },
  { id:'V08', lang:'en', cat:'Priority/urgency',           u:'Urgent: pay the electricity bill today before it gets cut',                   expect:{count:[1,5], wantsDate:true} },
  { id:'V09', lang:'en', cat:'Correction within utterance',u:'Book a table for six people, no wait, make it eight people on Friday',        expect:{count:[1,5], mustContain:'eight', mustNotContain:'six'} },
  { id:'V10', lang:'en', cat:'Conversational filler',      u:'Um so yeah I was thinking like maybe I should you know clean the garage',     expect:{count:[3,10], mustNotContain:'um'} },
  { id:'V11', lang:'en', cat:'Ambiguous — should clarify', u:'Sort out the thing for the place',                                            expect:{shouldClarify:true} },
  { id:'V12', lang:'en', cat:'Non-task speech',            u:'The weather is really nice today and I feel happy',                           expect:{shouldClarify:true} },
  { id:'V13', lang:'en', cat:'Duplicate instruction',      u:'Buy eggs. Buy eggs. Also buy eggs and bread',                                 expect:{count:[1,3], noDupes:true} },
  { id:'V14', lang:'en', cat:'Long multi-sentence',        u:'I am moving flats next month so I need to find a packers and movers service, sort out the deposit with my current landlord, update my address with the bank and the post office, cancel the internet connection, book a cleaner for the old flat, and buy new curtains for the new place.', expect:{count:[6,15]} },
  { id:'V15', lang:'hi', cat:'Hindi',                      u:'कल सुबह दूध और सब्ज़ी लानी है और बिजली का बिल भरना है',                            expect:{count:[2,6], wantsDevanagari:true} },
  { id:'V16', lang:'hi', cat:'Code-switch, Hindi tag',     u:'Kal office ke liye presentation ready karna hai aur Priya ko call karna hai',  expect:{count:[2,6], wantsDevanagari:true} },
  { id:'V17', lang:'en', cat:'Code-switch, English tag',   u:'Kal subah doodh lana hai aur mummy ko call karna hai',                         expect:{count:[2,6], wantsLatinOnly:true} },
  { id:'V18', lang:'en', cat:'Imperfect transcription',    u:'by grocery for the wek and cal the plumber tomorow',                           expect:{count:[2,6], mustContain:'plumber'} },
];

async function token() {
  const r = await fetch(`${AUTHURL}/token?grant_type=password`, {
    method:'POST', headers:{apikey:ANON,'Content-Type':'application/json'},
    body: JSON.stringify({email:'demo@wowtodo.local', password:'T150pass!234'}) });
  const j = await r.json();
  if (!j.access_token) throw new Error('auth failed: ' + JSON.stringify(j).slice(0,200));
  return j.access_token;
}

function userMessage(u, lang) {
  let m = `[LANGUAGE: ${lang === 'hi' ? 'Hindi' : 'English'}]\n\n`;
  m += `[CURRENT DATE: ${new Date().toISOString().split('T')[0]}]\n\n`;
  m += u;
  m += `\n\nExisting groups: [Cooking, Work, Home]`;
  return m;
}

const TOK = await token();
const results = [];

for (const t of DATASET) {
  const started = Date.now();
  let out = null, err = null;
  try {
    const r = await fetch(PROXY, {
      method:'POST',
      headers:{apikey:ANON, Authorization:`Bearer ${TOK}`, 'Content-Type':'application/json'},
      body: JSON.stringify({ target:'openai-chat', body:{
        model:'gpt-4o-mini', temperature:0.3, response_format:{type:'json_object'},
        messages:[{role:'system',content:SYSTEM},{role:'user',content:userMessage(t.u,t.lang)}] }})
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(body).slice(0,200)}`);
    out = JSON.parse(body.choices?.[0]?.message?.content ?? 'null');
  } catch (e) { err = String(e.message || e); }
  const ms = Date.now() - started;
  results.push({ ...t, ms, out, err });
  const n = out?.todos?.length ?? '-';
  console.log(`${t.id} ${String(ms).padStart(5)}ms todos=${String(n).padStart(2)} ${err ? 'ERR '+err.slice(0,60) : (out?.title ?? '')}`);
}

fs.writeFileSync('./eval160-results.json',
  JSON.stringify(results, null, 2), 'utf8');
const lat = results.map(r=>r.ms).sort((a,b)=>a-b);
console.log(`\nlatency ms  min=${lat[0]} p50=${lat[Math.floor(lat.length/2)]} max=${lat[lat.length-1]}`);
console.log(`errors: ${results.filter(r=>r.err).length}/${results.length}`);
