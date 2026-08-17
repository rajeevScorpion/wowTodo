# Prompt 160 — Voice-to-Todo Pipeline Audit and Evaluation Baseline

**Mode:** AUDIT + VERIFY (no product changes)

## Objective
Understand and measure the existing core voice experience before designing the agentic replacement/improvement.

## Trace the full current path
From microphone interaction through permission, recording/audio handling, transcription, prompt construction, AI/provider request, parsing/validation, todo object creation, persistence and UI feedback.

For each stage record:
- implementation file/service;
- input/output shape;
- provider/model/library;
- latency/timeouts/retry/cancellation;
- error/fallback behaviour;
- user-visible state;
- privacy/data sent externally;
- tests/logging/metrics;
- coupling that would make future change risky.

## Baseline evaluation dataset
Create a **documentation/test fixture only** (not production code unless an existing test-fixture convention already exists and no runtime behaviour changes) using `REFERENCE/04_VOICE_EVALUATION_DATASET_TEMPLATE.md`.

Include representative utterance categories such as:
- single direct task;
- multiple tasks in one utterance;
- relative date/time;
- named person/assignee where supported;
- sequencing/dependency ("after that", "once done");
- correction/revision inside speech;
- vague/ambiguous intent;
- conversational filler;
- Hindi;
- English;
- Hindi-English code switching if currently supported;
- long utterance;
- background/noisy or transcription-imperfect input where testable;
- duplicate/repeated instruction;
- non-task speech that should not become a todo;
- unsupported request that requires clarification rather than fabrication.

## Measure the current output
For each safely testable utterance capture expected intent vs actual output and score dimensions such as:
- task count correctness;
- action/verb correctness;
- entity/assignee extraction where supported;
- timing extraction where supported;
- task decomposition quality;
- preservation of user intent;
- hallucinated additions;
- missing tasks;
- duplicate tasks;
- ambiguity handling;
- structured-output validity;
- latency (rough observed ranges, not false precision).

Do not send real sensitive user data to providers for evaluation. Use synthetic test utterances.

## Required conclusions
- strongest current behaviours to preserve;
- top failure modes;
- whether problems originate in transcription, prompt/reasoning, parsing/schema, persistence or UX;
- whether the pipeline can support an agentic layer incrementally;
- safest insertion point for a new intent/planning layer;
- need for feature flag/fallback/canary;
- metrics required to prove improvement rather than assume it.

No provider/model/prompt/product change is allowed in this prompt.
