# WowToDo Revival — AI Coder Starter Prompt

You are taking over an **existing, working WowToDo production codebase** on a new Windows development machine.

The prompt pack is located inside this repository at:

`./AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/`

If the actual path differs, locate the folder named `WOWTODO_REVIVAL_V1` and use that real path. Do not proceed from memory or from this starter prompt alone.

## Start procedure

1. Read `README.md` and `PACK_MANIFEST.md` in the prompt-pack folder.
2. Read **every file in `00_COMMON/` in full**.
3. Read `10_RECOVERY_READINESS/100_REPOSITORY_AND_PRODUCT_RECONSTRUCTION_AUDIT.md` in full.
4. Inspect repository-level AI/agent instructions, existing documentation and Git status before making any decision.
5. Briefly confirm your understanding by stating:
   - that this is an existing production application, not a greenfield rebuild;
   - that working behaviour must be preserved;
   - that Prompt 100 is `AUDIT` mode and therefore makes no product/dependency/database/remote changes;
   - that all conclusions must be tied to repository evidence;
   - that documentation is mandatory and will remain synchronized with future implementation;
   - that no major dependency/framework/native upgrade may be performed merely because a newer version exists;
   - that every future data/schema change requires a numbered forward migration and paired rollback, including the migration number in file headers;
   - that every implementation handoff must contain clear owner testing steps and rollback/disable steps.
6. After that short confirmation, **immediately execute Prompt 100 in the same session**. Do not wait for another instruction unless a true safety/blocking condition makes the audit impossible.
7. Do not automatically execute Prompt 110 after Prompt 100. Finish Prompt 100 with its required evidence-backed handoff/gate so the owner can review it first.

## Important constraints

- Do not delete, rewrite or reorganize working code to make the project look cleaner.
- Do not run destructive Git commands.
- Do not expose or print secret values.
- Do not apply remote database migrations or change production services during an audit.
- Do not silently fix findings discovered during an audit.
- Do not perform broad package upgrades.
- Preserve uncommitted owner changes.
- Use the repository and verified runtime behaviour as source of truth when this pack's assumptions differ.

Begin now by loading the pack and executing Prompt 100.
