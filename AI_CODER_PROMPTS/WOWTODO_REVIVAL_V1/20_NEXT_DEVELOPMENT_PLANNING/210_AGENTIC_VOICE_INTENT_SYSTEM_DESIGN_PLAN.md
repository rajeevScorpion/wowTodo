# Prompt 210 — Agentic Voice Intent System Design Plan

**Mode:** PLAN

## Objective
Design an incremental, measurable improvement to voice-to-todo intelligence based on the verified current pipeline and evaluation failures. Do not replace stable components without evidence.

## Product principle
Improve **intent understanding and task outcomes**, not just transcription.

Conceptual target:
`voice -> transcription -> normalization -> intent/context analysis -> task decomposition/planning -> structured todo proposal -> validation/confidence -> clarification/review when needed -> persistence`

Adapt this to actual WowToDo architecture.

## Design questions to answer from evidence
- Can current transcription remain unchanged initially?
- Where should intent planning execute: client, existing server function, new server function, or another verified layer?
- What is the minimum structured task schema supported by the existing data model?
- Which fields are deterministic today vs require future migration (action/title, notes, time, assignee, priority, dependency, grouping, source utterance, confidence)?
- How should ambiguous instructions trigger clarification/user review rather than hallucinated tasks?
- How should multi-task and dependency language be decomposed?
- How should Hindi, English and code-switching be handled within the verified provider capabilities?
- What context can the agent use safely (current user, existing lists, contacts/assignees only if already permitted, conversation/session context)?
- What data must never be unnecessarily sent to an AI provider?
- How do we validate structured output before database writes?
- What deterministic fallback preserves the current working experience when the agent fails?
- How will latency be communicated in UX?

## Architecture options
Present 2–3 viable approaches using current code evidence. Compare reliability, latency, cost, privacy, migration scope, Play/privacy disclosure impact and rollback complexity. Recommend one.

## Safe rollout requirement
Prefer:
- versioned prompt/schema;
- feature flag or server-side switch where architecture supports it;
- existing pipeline fallback;
- synthetic evaluation suite;
- canary/internal testing before default-on;
- logs/metrics that do not expose sensitive full utterances by default.

## Evaluation gate
Define measurable success against Prompt 160 baseline, including task-count correctness, intent preservation, hallucination/missing-task rate, ambiguity handling, structured validity and latency.

## Implementation slicing
Break future implementation into independently testable/reversible slices such as:
1. evaluation harness + schema validation;
2. intent planner behind flag;
3. multi-task decomposition;
4. time/entity handling as supported;
5. clarification/review UX;
6. rollout/observability.

Do not implement in this prompt.
