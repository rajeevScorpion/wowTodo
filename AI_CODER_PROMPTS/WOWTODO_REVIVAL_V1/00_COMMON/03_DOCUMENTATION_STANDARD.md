# WowToDo Documentation Standard

**Documentation is mandatory and is part of the Definition of Done.**

The revival phase must first reconstruct accurate documentation for the existing app. After that, every feature/change must update the documents affected by that change in the same work increment.

## Required documentation spine
Adapt paths to existing repository conventions, but preserve the conceptual separation:

- **Product:** purpose, current capabilities, flows, release scope, non-goals, future scope.
- **Feature inventory:** implemented/verified features, partial features, defects, missing features.
- **Architecture:** repository map, app architecture, navigation/state, service/API layer, AI/voice pipeline, integrations.
- **Backend/data:** schema/data dictionary, auth/RLS, storage, functions, migration register.
- **Dependencies:** framework/runtime/native package register with reason, compatibility and upgrade status.
- **Voice/AI:** current pipeline, prompts/contracts/models/providers, structured output, failure behaviour, evaluation dataset and quality metrics.
- **Testing:** test strategy, device/API matrix, regression checklist, edge cases, known defects.
- **Operations:** environments, build profiles, signing ownership/location expectations, deployment/release runbook, monitoring, incidents.
- **Google Play:** package/application ID, versioning, permissions, privacy/data-safety mapping, store assets/status, release checklist.
- **Project control:** current state, decision log, changelog/release notes and active next step.

See `REFERENCE/01_RECOMMENDED_REPO_DOCUMENTATION_STRUCTURE.md`.

## Truth/status discipline
Every meaningful item should be labelled or clearly written as one of:
- `VERIFIED-IMPLEMENTED`
- `IMPLEMENTED-NOT-YET-VERIFIED`
- `PARTIAL`
- `PLANNED`
- `DEFERRED`
- `BLOCKED`
- `DEPRECATED`

Never write future intent as though it already exists.

## Documentation delta rule
Before coding, state which documents should change if the implementation succeeds. Update them in the same change when behaviour, navigation, schema, auth, permissions, configuration, environment variables, API contracts, AI prompts/contracts, dependencies, tests or deployment steps change.

## Decision records
For hard-to-reverse or cross-cutting decisions record: status, verified context, options, selection/rationale, consequences, related files/migrations and date.

## Feature documents
Each durable feature document should include: user problem, current status, scope/non-goals, user flow, data/permissions, AI/voice behaviour if relevant, UI states, error handling, acceptance criteria, tests, analytics if present, and rollback/disable strategy.

## Current-state update
At the end of every approved implementation, update current project state with: completed work, verified behaviour, current build/release status, open decisions, defects, migration state and next safe prompt.

## Owner readability
Documentation must remain understandable to a technically informed product owner. Avoid unexplained jargon and giant code dumps.
