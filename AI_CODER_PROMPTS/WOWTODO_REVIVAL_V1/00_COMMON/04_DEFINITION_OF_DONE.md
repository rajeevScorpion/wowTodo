# WowToDo Definition of Done

A task is complete only when every applicable condition is satisfied.

## Product
- Approved acceptance criteria work without unapproved scope expansion.
- Loading, empty, success, error, permission and retry states exist where relevant.
- Ambiguous AI interpretation is not silently persisted when user confirmation is warranted.
- Release-critical existing flows still work.

## Voice/AI quality when applicable
- The change is evaluated on a documented set of representative utterances, not one demo sentence.
- Structured output is validated before persistence.
- Malformed/empty/provider-failure responses have deterministic fallback/error behaviour.
- Hindi/English/mixed-language behaviour is tested if those are supported in the verified product.
- Prompt/model/version changes are documented and regression-tested.

## Android/device quality
- The verified Android development workflow succeeds on the new Windows machine.
- App launch and changed flows are checked on emulator and, when available, a physical Android device.
- Permission-denied/revoked flows are tested for microphone/notifications/other sensitive permissions in scope.
- Safe-area, keyboard, lifecycle/background/foreground behaviour is checked where relevant.

## Data/security
- Data changes use numbered forward migration + paired rollback.
- Migration numbers appear in filenames and headers.
- Forward/rollback are tested where feasible.
- RLS/authorization are positively and negatively verified.
- No secrets/elevated credentials are shipped in the client.

## Engineering
- Existing conventions are followed unless an approved decision changes them.
- Applicable format/lint/type/unit/integration/build checks pass.
- No unrelated dependency upgrades/refactors.
- No placeholder critical path is represented as complete.

## Documentation/handoff
- Documentation delta is complete and truthful.
- Project state/changelog/migration/dependency registers are current as applicable.
- The coder gives short, clear owner testing steps with expected results.
- Rollback/disable instructions are provided.
- Known limitations and next safe prompt are stated.
