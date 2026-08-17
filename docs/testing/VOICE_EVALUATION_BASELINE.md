# Voice / AI Evaluation Baseline

**Baseline date:** 2026-08-17 · **Model:** `gpt-4o-mini`, temperature 0.3, JSON mode
**Prompt:** `src/services/ai/prompt.ts` (extracted from source at run time, not copied)
**Harness:** synthetic utterances sent through the real `ai-proxy` with a real user JWT —
the same path the app uses. No real user data was sent.

This is the **regression baseline**. Re-run it after any prompt, model or pipeline change
and compare. Do not tune the prompt against this set alone — keep a holdout.

## Headline

| Metric | Result |
|---|---|
| Structured-output validity | **18/18** — every response valid JSON matching the schema |
| Pipeline errors | **0/18** |
| Latency (end to end, local proxy → OpenAI) | min 1.9s · **p50 2.6s** · max 5.5s |
| Intent preserved | 16/18 |
| **Named-weekday date accuracy** | **9/9** ✅ *(was 0/9 — fixed, see VE-1 below)* |
| Ambiguity/non-task handling | **0/2** — fabricates instead of clarifying |
| Language-tag compliance | 2/3 |

## Dataset and results

Scoring: ✅ pass · ⚠️ partial · ❌ fail

| ID | Lang | Category | Utterance | Expected | Actual | Score |
|---|---|---|---|---|---|---|
| V01 | en | Single direct task | "Call the dentist to book a cleaning" | 1–4 todos | 3 todos; adds "Find the dentist's phone number" | ⚠️ over-decomposed |
| V02 | en | Two independent tasks | "Buy milk and also renew my car insurance" | 2–6 | 5; 4 of them invented insurance sub-steps | ⚠️ |
| V03 | en | Three+ tasks | "book flights, reserve a hotel, get travel insurance and pack" | 4–10 | 4, exact 1:1 | ✅ |
| V04 | en | Relative time | "submit the tax form next Monday" | 2026-08-24 | **2026-08-21 (Friday)** | ❌ |
| V05 | en | Explicit time | "Dinner party this Saturday at 7pm" | 2026-08-22T19:00 | **2026-08-20T19:00 (Thursday)** — time ✅, date ❌ | ❌ |
| V06 | en | Sequencing | "First defrost… after that marinate… once done grill" | ordered 3 | defrost → marinate → grill, exact order | ✅ |
| V07 | en | Named person | "Ask Priya… tell Rahul to review it" | names kept | both names preserved in todo titles | ✅ |
| V08 | en | Priority/urgency | "Urgent: pay the electricity bill today" | today | date ✅ 2026-08-17; but invents "Log into online banking" | ⚠️ |
| V09 | en | Correction mid-utterance | "table for six, no wait, make it eight… Friday" | eight, 2026-08-21 | title "Book Table for **Eight**" ✅; date **2026-08-19 (Wed)** ❌; fabricates 19:00 | ⚠️ |
| V10 | en | Conversational filler | "Um so yeah… maybe I should you know clean the garage" | filler stripped | "Clean the Garage", 7 clean todos | ✅ |
| V11 | en | Ambiguous | "Sort out the thing for the place" | **should clarify** | invents 5 todos incl. "Transport items to donation center" | ❌ |
| V12 | en | Non-task speech | "The weather is really nice today and I feel happy" | **should clarify / no task** | invents "Enjoy the Nice Weather" + 4 todos | ❌ |
| V13 | en | Duplicate instruction | "Buy eggs. Buy eggs. Also buy eggs and bread" | deduplicated | 2 todos — "Buy 12 eggs", "Buy 1 loaf of bread" | ✅ |
| V14 | en | Long multi-sentence | 6-item moving-flat instruction | 6–15 | 7 todos, exact 1:1, nothing invented or dropped | ✅ |
| V15 | hi | Hindi | "कल सुबह दूध और सब्ज़ी लानी है…" | Devanagari out | full Devanagari, 3 todos | ✅ |
| V16 | hi | Code-switch, **Hindi** tag | "Kal office ke liye presentation ready karna hai…" | Devanagari out | **entirely English** — tag violated | ❌ |
| V17 | en | Code-switch, English tag | "Kal subah doodh lana hai aur mummy ko call karna hai" | English out | "Get Milk and Call Mom" | ✅ |
| V18 | en | Imperfect transcription | "by grocery for the wek and cal the plumber tomorow" | recovers intent | 3 todos, plumber + groceries recovered | ✅ |

## Strengths to preserve

1. **Structured-output reliability is excellent** — 18/18 valid, 0 parse failures across 27
   total calls. `validateAIResponse` never had to reject anything.
2. **Multi-task decomposition is accurate.** V14's 6-item instruction produced exactly 7
   todos with no hallucination and nothing dropped — the hardest test in the set.
3. **Deduplication works** (V13: three "buy eggs" → one).
4. **Sequencing is respected** (V06 in exact dependency order).
5. **Named entities survive** (V07: Priya, Rahul).
6. **Disfluency handling is strong** (V10 filler, V18 misspellings both recovered).
7. **Hindi output is genuinely good** when the input is Devanagari (V15).

## Failure modes, ranked

### 1 — Named-weekday dates were systematically wrong · P1 · ✅ **FIXED**
**Was 9/9 failures, fully deterministic across 3 runs each. Now 9/9 correct.**

| Input | Got | Weekday | Correct |
|---|---|---|---|
| "next Monday" | 2026-08-21 | Friday | 2026-08-24 |
| "this Saturday" | 2026-08-20 | Thursday | 2026-08-22 |
| "on Friday" | 2026-08-19 | Wednesday | 2026-08-21 |

**Origin: the prompt, not the model's competence.** `buildUserMessage` sends
`[CURRENT DATE: 2026-08-17]` with **no weekday**, and LLMs cannot reliably derive
day-of-week from a bare date. Pure relative offsets work correctly ("today" → ✅,
"next month" → ✅) — only *named weekdays* fail.

**Impact was direct and user-visible:** reminders fired on the wrong day, which is the
core promise of the product.

**Fix (release plan slice 6).** Adding the weekday to the tag — the obvious first
attempt — changed **nothing**: output was byte-identical, still 0/9. The model does not
do calendar arithmetic reliably even when told what day it is. So the arithmetic moved
into TypeScript (`services/ai/dateContext.ts`), which hands the model a resolved lookup
table for the coming seven days and tells it not to compute dates itself.

Result: **9/9** on the isolated probe (3 phrasings × 3 runs) and **4/4** on the
baseline's date-bearing cases, against 1/4 before. The same helper also fixed a second,
previously unnoticed bug: the tag was built with `toISOString()` (UTC), so for a user in
IST every task created before 05:30 local was dated to the previous day.

### 2 — Fabrication on ambiguous and non-task input · P1
The prompt instructs *"Prefer being helpful over asking for clarification"* and
*"Never refuse to generate output."* Consequence: **"The weather is really nice today"**
becomes a 4-item task list. The pipeline is structurally **incapable of asking a
clarifying question** — there is no schema field to express uncertainty. This is the
single most important constraint for the agentic redesign (210).

### 3 — Language tag violated on romanised Hindi · P2
V16 sent `[LANGUAGE: Hindi]` with Latin-script Hinglish and got **English** output.
The prompt explicitly requires Devanagari. Devanagari input (V15) works, so the trigger
is script, not language.

### 4 — Over-decomposition of atomic tasks · P2
"Call the dentist" → 3 steps including "Find the dentist's phone number". "Pay the
electricity bill" → 5 steps including "Log into online banking account", assuming a
payment method the user never mentioned. The `3-15 todos` floor pushes trivial tasks
into invented busywork.

### 5 — Fabricated times · P3
V09 produced `19:00` for a dinner booking where no time was stated, despite the prompt's
"Do NOT fabricate times".

## Where the problems originate

| Stage | Verdict |
|---|---|
| Transcription (Whisper) | ✅ not implicated — V18 shows the chain recovers from imperfect text |
| **Prompt construction** | ❌ **missing weekday context — cause of the worst defect** |
| **Prompt policy** | ❌ "never clarify" + "3-15 todos" cause fabrication and over-decomposition |
| Model/reasoning | ⚠️ minor — mostly follows instructions given |
| Parsing/schema | ✅ robust, 0 failures |
| Persistence | ✅ verified in 150 |
| UX | ❌ no cancel, no timeout (F4); no way to surface a clarifying question |

**Conclusion: the current weaknesses are overwhelmingly in the prompt layer, not the
model, the transcription or the plumbing.** That is good news for the agentic work —
the expensive parts are sound.

## Can the pipeline support an agentic layer incrementally?

**Yes.** The architecture is well-positioned:

- `services/ai/index.ts` is a **single orchestration seam**. Every caller uses
  `generateTask()`; nothing else knows about providers.
- Providers are already abstracted behind `ai-proxy` with a server-side model allow-list.
- `review.tsx` already interposes a **human confirmation step** between AI output and
  persistence — the natural place to surface a clarifying question.

**Safest insertion point:** a new intent/planning layer *inside* `generateTask()`, behind
the existing signature. Callers stay unchanged; the `AIGeneratedTask` contract stays
unchanged; the agentic path can be added as an alternative implementation.

**Required first:** the schema has no field for uncertainty, so a clarification-capable
agent has nowhere to put a question. That is an additive change (optional field), which
keeps it backward compatible.

### Needs a feature flag
Yes. `ai-proxy` must gain a model allow-list entry for any new model, and the fallback is
failure-driven — so a broken agentic path would silently fall through to Gemini with the
old prompt. A flag plus a canary is required to attribute regressions.

## Metrics required to prove improvement

None of these exist today — **nothing records prompt version, latency, cost, or fallback
rate**. Before changing the pipeline, capture at minimum:

| Metric | Why |
|---|---|
| Prompt/schema version per request | Otherwise A/B attribution is impossible |
| End-to-end latency (p50/p95) | Baseline: **p50 2.6s**, max 5.5s |
| Token cost per request | Agentic loops multiply cost silently |
| Provider fallback rate | Currently invisible; a broken OpenAI path looks "fine" |
| Structured-output rejection rate | Baseline **0/18** — regressions must be caught |
| Date-extraction accuracy | Baseline **0/9** on named weekdays — the clearest win available |
| Clarification rate vs fabrication rate | Baseline: 0% clarify, 100% fabricate on V11/V12 |

## Reproducing

Harness: `scratchpad/eval160.mjs` (evaluation fixture, not product code). Requires the
local stack, `supabase functions serve`, and a local user. Extracts the system prompt from
source so it cannot drift from what ships.
