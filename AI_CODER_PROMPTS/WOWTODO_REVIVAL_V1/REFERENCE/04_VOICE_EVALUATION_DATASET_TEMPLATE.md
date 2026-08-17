# Voice Evaluation Dataset Template

Use synthetic, privacy-safe utterances. Store expected semantics, not private real-user speech.

| ID | Language | Category | Synthetic utterance/transcript | Expected task count | Expected tasks/intents | Expected timing/entities/dependency | Should clarify? | Current output | Result notes |
|---|---|---|---|---|---|---|---|---|---|

## Minimum categories
1. Single direct task.
2. Two independent tasks.
3. Three or more tasks.
4. Relative time: today/tomorrow/next week.
5. Explicit time.
6. Sequencing/dependency.
7. Named person/assignee if supported.
8. Priority/urgency language.
9. Correction within utterance.
10. Conversational filler.
11. Ambiguous request that should clarify.
12. Non-task speech.
13. Duplicate/repeated instruction.
14. Long multi-sentence instruction.
15. English.
16. Hindi.
17. Hindi-English code switching if supported.
18. Imperfect transcription simulation.

## Suggested scoring dimensions
Use simple pass/fail or 0–2 scales unless the project already has a test framework:
- correct task count;
- action/title fidelity;
- missing-task penalty;
- hallucinated-task penalty;
- entity/time/dependency correctness where supported;
- ambiguity handling;
- valid structured output;
- duplicate control;
- end-to-end success;
- observed latency bucket.

Never optimize prompts against only this static set. Maintain a small holdout set for regression.
