# Voice / AI Evaluation Baseline

**Baseline date:** 2026-08-17 · **Model:** `gpt-4o-mini`, temperature 0.3, JSON mode
**Prompt:** `src/services/ai/prompt.ts` (extracted from source at run time, not copied)
**Harness:** synthetic utterances sent through the real `ai-proxy` with a real user JWT —
the same path the app uses. No real user data was sent.

This is the **regression baseline**. Re-run it after any prompt, model or pipeline change
and compare. Do not tune the prompt against this set alone — keep a holdout.

```bash
npm run eval:voice                    # all cases
npm run eval:voice -- --only=V11,V12  # one failure mode
```

## Scoring is automated (2026-08-20)

The table below was scored **by hand** in the original prompt-160 run. That was fine for a
one-off audit and useless for the agentic work, which needs to prove each phase is an
improvement rather than argue it. The harness now scores itself and prints a scorecard.

Three changes came with it, all of which alter what a run *means*:

1. **Pacing.** The set predates the rate limiter added in migration 0015. Run unpaced
   today and the tail of the run is scored as failures that are really `429`s. Requests
   are now spaced 4.2s apart, and a 429 or a transient upstream fault gets one retry —
   which fired for real on V18 during the reference run (`received corrupt message of
   type InvalidContentType` on a TLS connect to OpenAI). A transient blip is not a
   finding; a reproducible one still fails, because the retry fails too.
2. **The pacing delay is outside the timer.** Folding it in added ~4.2s to every reported
   latency and would have quietly invalidated every comparison to the p50 below.
3. **Seven new cases (V19–V25)** covering the specialist domains the agentic work
   introduces. V01–V18 and the pinned date are **frozen** — editing one silently
   invalidates every historical comparison.

### Reference run — legacy single-prompt path, 25 cases, 2026-08-20

| Dimension | Result |
|---|---|
| Structured validity | **25/25** |
| Pipeline errors | **0/25** |
| Todo count in range | 22/22 |
| **Date accuracy** (named weekdays and relative dates) | **7/7** — the `dateContext.ts` fix holds, now measured every run |
| **Clarifies instead of fabricating** | **0/3** ❌ — V11, V12, V25 |
| Language / script compliance | 3/4 — V16 still fails |
| Ordering · entities · dedup · corrections | 1/1 · 1/1 · 1/1 · 2/2 |
| Cases fully passing | **21/25** |
| Latency, V01–V18 only | min 2.5s · **p50 4.0s** · max 12.8s |
| Latency, V19–V25 (new, longer outputs) | min 3.4s · p50 5.4s · max 6.9s |

> **The p50 moved from 2.6s to 4.0s on the identical 18-case set**, with the prompt and
> model unchanged. Not attributed — it could be OpenAI-side, the local Docker network, or
> the day. Recorded rather than explained, because it matters: the agentic design budgets
> **two** model calls at ~4s total, and a single call already costing 4.0s here puts that
> budget under real pressure. Re-measure before treating the budget as met.

### Agentic path — 25 cases, 2026-08-21

`npm run eval:voice -- --target=agent`. Same dataset, same pinned date, same scorer.
Architecture: [AGENTIC_INTENT_SYSTEM.md](../architecture/AGENTIC_INTENT_SYSTEM.md).

| Dimension | Legacy | Agentic |
|---|---|---|
| **Asks when it should, plans when it should** | **0/3** asks; never over-asks | **25/25** |
| Language / script compliance | 3/4 (V16 fails) | **4/4** |
| Date accuracy | 7/7 | 7/7 |
| Todo count in range | 22/22 | 21/22 |
| Routed to the right agent | n/a | **6/6** |
| Structured validity | 25/25 | 22/22 (3 clarified) |
| Pipeline errors | 0/25 | 0/25 |
| **Cases fully passing** | **21/25** | **24/25** |
| Latency p50 | 4613ms | **4072ms** |

The clarification row is not directly comparable: the legacy run predates the symmetric
scoring, so its stored scores only cover the three "should ask" cases. Legacy never asks
about anything, so it scores 0/3 on asking and passes the other 22 by construction — an
effective 22/25 against the agentic path's 25/25.

**p50 fell despite two model calls per request.** Each specialist prompt is much smaller
than the 4,000-token generalist it replaced, so input tokens per call dropped more than
the extra call added.

Three regressions were found and fixed during the run, all by this harness:

1. A 10-item invented grocery list for "buy grocery for the week" — the shopping
   specialist now refuses to invent items for a generic request.
2. A **07:00 alarm** on "gym in the morning" — times now require the router *and* a regex
   over the utterance to agree.
3. A recipe with 13 shopping steps and no cooking method at all.

One expectation was corrected rather than the code: **V21's count was widened from
`[4,12]` to `[3,12]`**. It predated the schedule specialist, whose rule is "one step per
commitment the user named"; three commitments should give three steps, so the test
contradicted the design it was checking. Recorded here because moving a goalpost silently
is how an evaluation suite stops meaning anything.

The remaining failure is **V24** (Hindi paneer recipe), which compressed a method to 3
steps. `gpt-4o` fixes it and breaks V21 in exchange at ~15x the cost, so it was not
adopted — see the model bake-off note in the architecture doc.

The two failure modes below are unchanged **on the legacy path** and now have automatic
scores attached.

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
| V04 | en | Relative time | "submit the tax form next Monday" | 2026-08-24 | ~~2026-08-21 (Friday)~~ → **2026-08-24 (Monday)** | ✅ *fixed* |
| V05 | en | Explicit time | "Dinner party this Saturday at 7pm" | 2026-08-22T19:00 | ~~2026-08-20 (Thu)~~ → **2026-08-22T19:00 (Saturday)** | ✅ *fixed* |
| V06 | en | Sequencing | "First defrost… after that marinate… once done grill" | ordered 3 | defrost → marinate → grill, exact order | ✅ |
| V07 | en | Named person | "Ask Priya… tell Rahul to review it" | names kept | both names preserved in todo titles | ✅ |
| V08 | en | Priority/urgency | "Urgent: pay the electricity bill today" | today | date ✅ 2026-08-17; but invents "Log into online banking" | ⚠️ |
| V09 | en | Correction mid-utterance | "table for six, no wait, make it eight… Friday" | eight, 2026-08-21 | "Book Table for **Eight**" ✅; ~~2026-08-19 (Wed)~~ → **2026-08-21 (Friday)** ✅; still fabricates 19:00 | ⚠️ *date fixed* |
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
| **Prompt construction** | ✅ **fixed** — dates now resolved in code (`dateContext.ts`) |
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

Harness: [`app/scripts/eval-voice-baseline.mjs`](../../app/scripts/eval-voice-baseline.mjs),
run with `npm run eval:voice`. Requires the local stack (`supabase start`) and a configured
`OPENAI_API_KEY` in `supabase/functions/.env`. It extracts the system prompt from source at
run time so it cannot drift from what ships, provisions its own eval user, and pins the
date to 2026-08-17 so results stay comparable.

Full per-case output lands in `eval-legacy-results.json` (gitignored — synthetic
utterances and model responses only; this document is the committed record).

The exit code reflects **pipeline health only**, not model quality: a failing case is a
finding to compare against this baseline, not a broken build. Only a genuine pipeline
error fails the run.

### Specialist-domain cases (V19–V25)

Added for the agentic redesign. `agent` expectations are scored only under
`--target=agent`, which arrives with the `ai-agent` function in phase 1.

| ID | Lang | Probes | Expected agent |
|---|---|---|---|
| V19 | en | Recipe needing quantities — "chicken biryani for six this Sunday" | `recipe` |
| V20 | en | Multi-leg trip — flights, hotel, sightseeing | `trip` |
| V21 | en | Time-blocked day — gym, three calls, a report | `schedule` |
| V22 | en | Flat shopping list, no times | `shopping` |
| V23 | en | Milestone project with a deadline | `project` |
| V24 | hi | Recipe in Devanagari — specialist **and** language together | `recipe` |
| V25 | en | Ambiguous with a hint — "I should do something for mom" | should clarify |

V19 is the clearest illustration of why one shared prompt is not enough: it produces a
plausible biryani plan whose steps sometimes carry no quantities at all, which is the
difference between a recipe and a list of gestures. The score is unstable across runs
(it passed the reference run and failed a probe run an hour earlier) — exactly the kind
of coin-flip a focused specialist prompt should turn into a floor.
