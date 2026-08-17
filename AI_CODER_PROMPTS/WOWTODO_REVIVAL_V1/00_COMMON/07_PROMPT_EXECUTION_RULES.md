# Prompt Execution Rules

## Before every numbered prompt
1. Read all files in `00_COMMON`.
2. Read repository agent instructions and latest project-state/decision documents.
3. Inspect Git status and preserve unrelated changes.
4. Read the entire numbered prompt.
5. State prompt number and execution mode.
6. Confirm prior prompt gate/evidence if it is a prerequisite.

## Modes
- `AUDIT` — inspect/report only.
- `VERIFY` — run existing/verified checks; do not silently fix findings.
- `IMPLEMENT-DOCS` — documentation changes only from verified evidence.
- `PLAN` — design/triage plan only; no product implementation.

## Stop conditions
Stop and surface the issue when:
- repository reality materially conflicts with a prompt assumption;
- overlapping uncommitted owner changes make inspection unsafe;
- required access/signing/account information cannot be inspected and blocks the current conclusion;
- a migration cannot have a truthful safe rollback;
- a major architectural/provider/paid-service decision is unresolved;
- a requested check risks production data or remote destructive action.

A missing optional fact should not halt all useful work: complete the non-destructive evidence you can, mark the item blocked, and state the smallest owner action needed.

## Output discipline
- Be concise but evidence-backed.
- Cite file paths, configuration keys (not secret values), commands and observed outputs.
- Do not paste huge code files.
- Never claim tests/builds you did not run.
- Do not silently fix audit findings.
- Do not start the next numbered prompt automatically.
