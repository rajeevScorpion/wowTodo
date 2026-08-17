# Git and Change Safety

- Inspect `git status`, current branch, remotes and recent relevant history before changes.
- Never discard uncommitted owner changes.
- Never use `reset --hard`, `clean -fd`, force-push or history rewriting without explicit owner authorization.
- Keep audit work read-only except harmless local build artifacts.
- For implementation, use focused commits/branches if the repository workflow supports them.
- Do not combine unrelated refactors with a release-critical fix.
- Before risky implementation, record the known-good commit/build identifier where possible.
- Ensure generated secrets, `.env` files, signing keys, keystores and service-account material are ignored and never printed into reports.
- A successful build does not automatically justify committing changed lockfiles/configuration. Explain every diff.
