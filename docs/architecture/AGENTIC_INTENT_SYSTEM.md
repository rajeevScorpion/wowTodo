# Agentic Intent System

**Implemented 2026-08-21 (phases 1 and 2 of prompt 210).** Deployed to cloud and
`AGENT_ROLLOUT=all` — live for every user, by owner decision on 2026-08-21. The
pre-agentic pipeline is documented separately in
[VOICE_AI_PIPELINE.md](VOICE_AI_PIPELINE.md) and is still the fallback for every request.

## Why

One `gpt-4o-mini` call against one ~4,000-token prompt tried to be a recipe expert, trip
planner, shopping-list builder, fitness coach and study planner at once. The prompt-160
evaluation showed the plumbing was sound — 18/18 valid structured output, 0 parse failures
— and that every remaining failure was prompt policy:

| Failure | Measured | Cause |
|---|---|---|
| Fabricates on ambiguous input | 0/3 | *"Never refuse to generate output"*, and **no schema field for uncertainty** |
| Over-decomposes atomic tasks | "Call the dentist" → 3 steps | a `3-15 todos` floor |
| Ignores the language tag on romanised Hindi | V16 | script, not language |

## Shape

A **bounded pipeline**, not an agent loop. Agent-to-agent handoff costs a round trip and a
model call per hop, and this runs while a person watches a spinner on a phone.

```
transcript
  ├─ [0] Normalise ...... deterministic. script detection, client's local date
  ├─ [1] ROUTER ......... 1 call, gpt-4o-mini, ~300-token prompt
  │        → is_request · needs_clarification · question · agent · topic
  │          · confidence · language · has_explicit_time
  │        clarification → RETURN. No second call, no plan.
  ├─ [2] SPECIALIST ..... 1 call, focused prompt, streamed
  └─ [3] VALIDATE ....... deterministic; one repair attempt, else fall back
```

Two model calls, always. Specialists: `recipe` · `trip` · `schedule` · `shopping` ·
`project` · `general`. Adding a seventh is one file in
[`agents/`](../../app/supabase/functions/ai-agent/agents/), one line in `registry.ts`, one
bullet in the router prompt.

## Three decisions worth knowing

### The response is a stream

For the UI to say *"Recipe agent is planning your Butter Chicken"*, it must learn the
routing decision **while the specialist is still running**. A JSON response cannot narrate
a decision it has already finished making. So `ai-agent` emits server-sent events —
`routed`, `clarify`, `progress`, `done`, `error` — and every stage the user sees is driven
by a real one. Nothing advances on a timer, which would be most confident exactly when the
request has stalled.

React Native's global `fetch` cannot read a body incrementally; `expo/fetch` can. It is
required **lazily**: importing it at module scope pulls Expo's native fetch into every
environment that touches `services/ai`, which broke an existing jest suite outright. Where
it is unavailable the whole body is read at once — the task is still created, only the
live commentary is lost.

### Field order in the router's JSON is load-bearing

In JSON mode the model emits fields in schema order. With `agent` first, it committed to a
specialist before ever reaching `needs_clarification`, and would not then contradict
itself: "The weather is really nice today and I feel happy" routed to `general` and became
a seven-item checklist. Moving `is_request` and `needs_clarification` **above** `agent`
changed that case from a plan to a question.

`is_request: false` is also honoured even when `needs_clarification` is not set — they are
the same judgement asked twice, and a disagreement means the router is confused about an
utterance it has already said contains no task.

### Times are gated by two independent checks

`has_explicit_time` from the router **and** a regex over the utterance must both agree
before any clock time survives validation. Neither alone is sufficient:

- The prompt alone failed: `base.ts` forbids invented times in two places, and the first
  real run still produced `event_time: 19:00` for "this Sunday".
- The router alone failed: it reported "gym in the morning, three client calls" as
  containing an explicit time, and the plan came back with a **07:00 alarm** on the gym.

These values become notifications on a lock screen. A missing time is an empty field the
user can fill; a fabricated one wakes them up.

## Fallback

Every failure ends with the client falling back to the legacy `ai-proxy` path, unchanged.
A worse plan beats no plan. **The one exception is a clarifying question**, which must
propagate — falling back would hand the same utterance to the prompt that fabricates and
produce precisely the invented task the question existed to prevent.

`503` (rollout off) and `404` (not deployed) latch for the life of the process, so a user
who is not on the rollout does not pay a round trip before every task they create. A `500`
or a timeout stays retryable — those are not statements about the account.

## Rollout

| Variable | Values | Meaning |
|---|---|---|
| `AGENT_ROLLOUT` | `off` (default) · `owner` · `all` | who reaches the planner |
| `AGENT_OWNER_IDS` | comma-separated uuids | used when `owner` |
| `AGENT_SPECIALIST_MODEL` | must be in `AGENT_MODELS` | the quality lever |

Off by default: a new pipeline is opted into, never out of. Checked **before** the quota,
so a disabled agent costs the user nothing. Changing it needs no app release — which is
the entire reason the orchestrator is server-side.

**Currently `all` in cloud.** To roll back, no deploy and no release is needed:

```bash
supabase secrets set AGENT_ROLLOUT=off
```

Every client falls back to the legacy path on the next request, and the `503` latch means
each app process pays that cost once rather than per task.

## Quota

One unit per **user action**, not per model call, sharing the `chat` budget with
`ai-proxy`. The router call is an implementation detail; charging for it would halve the
ceiling from 15 tasks/minute to 7. A runaway loop is bounded in code — the function makes
at most two calls, plus one repair — not by the budget. Worst-case spend per unit is
roughly double the legacy path.

## Observability

One `ai_runs` row per request (migration 0017): agent, prompt version, model, router
model, latency, tokens, outcome, `fallback_used`. **No utterance, transcript or task
text** — correlate through `task_id`. `outcome` separates `ok` · `clarified` · `invalid` ·
`error` · `rate_limited`; `clarified` is a **success**.

## Measured against the baseline

`npm run eval:voice -- --target=agent`, 25 cases, 2026-08-21. Full detail in
[VOICE_EVALUATION_BASELINE.md](../testing/VOICE_EVALUATION_BASELINE.md).

| Dimension | Legacy | Agentic |
|---|---|---|
| **Asks when it should, plans when it should** | **0/3** asks | **25/25** |
| Language / script compliance | 3/4 | **4/4** |
| Date accuracy | 7/7 | 7/7 |
| Routed to the right agent | n/a | 6/6 |
| Structured validity | 25/25 | 22/22 (3 clarified) |
| Cases fully passing | 21/25 | **24/25** |
| Pipeline errors | 0/25 | 0/25 |
| Latency p50 | 4613ms | **4072ms** |

Lower p50 despite two model calls: each specialist prompt is far smaller than the 4,000-
token generalist it replaced, so the input token count per call fell more than the extra
call added.

## Known limitations

- **Recipe step count is inconsistent** on `gpt-4o-mini`. V24 (Hindi paneer) collapsed a
  method into 3 steps in the final run; V19 does the same intermittently. `gpt-4o` fixes
  it — and broke V21 in exchange, at roughly 15x the cost, so it was not adopted. Revisit
  with a measurement, not an assumption.
- **Branch generation still uses the legacy path entirely.** Only `generateTask` is
  routed through the agent.
- The eval harness runs against the **local** stack, so `npm run eval:voice` measures
  local code rather than what cloud is currently serving. Deploy after a prompt change or
  the two drift silently.

## Phase 2 — the voice flow

The transcript-review step is gone. `index.tsx` passes `autoGenerate: '1'` on the voice
path exactly as the typed path already did, so speaking a task goes straight to a result.
**Nothing was deleted**: `review.tsx`'s text-editing state stayed and became the
clarification and repair surface, reached only when it is actually useful.

That screen was doing hidden work. The user read their own words back while the request
ran, so the wait had somewhere to live. Removing it makes the gap bare — Whisper, router,
specialist — and `AgentStatus` fills it with the stage the pipeline is genuinely in:

| Stage | Driven by | Progress | Example |
|---|---|---|---|
| Transcribing | local Whisper call | 20% | *Transcribing…* |
| Understanding | POST sent, awaiting `routed` | 45% | *Understanding what you need…* |
| Planning | `routed` event | 65% | ***Recipe agent is planning chicken biryani*** |
| Building | `progress` events | 85% | *6 steps so far…* |
| Ready | `done` event | 100% | *8 steps ready* |

The copy lives in [`agentStatus.ts`](../../app/src/services/ai/agentStatus.ts) as a pure
function so it is unit-testable without the render stack, and the switch is exhaustive
over the stage union — an unhandled stage is a compile error, not a blank line.

Two rules the tests enforce, because both fail silently rather than loudly:

- **No topic means generic wording, never an invented one.** `cleanTopic` returns `null`
  and the caller checks `=== null` rather than truthiness, so a regression in the cleaner
  cannot quietly render "Recipe agent is planning " with nothing after it.
- **`building` progress is not derived from the step count.** The total is unknown while
  steps arrive, so any percentage from it would be fabricated — and would move fastest on
  the longest lists, which is backwards. The count does the talking instead.

`todos.note` now renders in both the result preview and `TodoItem`, which is what makes
the recipe specialist's quantities visible at all. They were being dropped by
`normalizeAITodos` before it — the task looked fine and was simply missing its amounts,
with the agent taking the blame for a client-side loss.
