# Prompt 140 — Documentation Scaffold and Verified Baseline

**Mode:** IMPLEMENT-DOCS

## Objective
Create or repair the durable WowToDo documentation system using only verified evidence from Prompts 100–130. Do not modify product behaviour.

## Preflight
Inspect existing docs and repository conventions. Preserve useful documents. Avoid duplicate sources of truth.

## Create/adapt the documentation spine
Use `REFERENCE/01_RECOMMENDED_REPO_DOCUMENTATION_STRUCTURE.md` as a conceptual template. At minimum establish:
- current project state;
- product/current feature inventory;
- architecture/repository overview;
- voice/AI pipeline current state;
- data model/auth/RLS overview;
- dependency register;
- Windows development setup and verified build commands;
- testing strategy/device matrix/regression checklist;
- Google Play release readiness/status;
- decision log;
- changelog/release notes;
- migration register/standard link where data migrations exist;
- prompt-pack execution index.

## Repository AI instructions
If the repo has an AI-agent instruction file, carefully merge WowToDo rules into it rather than overwriting. If none exists, create an appropriately named instruction document only if repository tooling supports/benefits from it. It must enforce inspection, documentation, migration/rollback, no broad upgrades, testing/handoff and secret safety.

## Content discipline
- Use verified facts only.
- Mark unresolved items `UNKNOWN/BLOCKED`, not guessed.
- Keep planned agentic voice architecture separate from current implementation.
- Link to source files rather than duplicating code.
- Make owner-facing setup/release instructions readable.

## Required handoff
List documents created/updated, verified facts populated, unknowns retained, and how the owner can review them. No product code changes are allowed.
