# Environment Variables

**Names and purposes only. Never record a value in this repository.**

## `app/.env` — client

Anything prefixed `EXPO_PUBLIC_` is **inlined into the app bundle** and must be treated as
public.

| Name | Purpose | Public? | Status |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase API endpoint. `http://10.0.2.2:55321` for the emulator against local | yes | ✅ in use |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key — public by design; RLS is the real control | yes | ✅ in use |
| `EXPO_PUBLIC_OPENAI_API_KEY` | *(historical)* was read directly by the client | **would be public** | ⚠️ **DEAD — delete** |
| `EXPO_PUBLIC_GEMINI_API_KEY` | *(historical)* as above | **would be public** | ⚠️ **DEAD — delete** |

> The two dead entries are no longer read by any source file and are **not** present in a
> production bundle (verified: 0 `sk-`, 0 `AIza`). They are stale duplicates of the
> Edge Function secrets and should be removed so they are not reintroduced.

## `app/supabase/functions/.env` — Edge Function, local

Never bundled into the app. Gitignored.

| Name | Purpose |
|---|---|
| `OPENAI_API_KEY` | `gpt-4o-mini` chat + `whisper-1` transcription. Shared by `ai-proxy` and `ai-agent` |
| `GEMINI_API_KEY` | `gemini-2.0-flash` fallback |
| `AGENT_ROLLOUT` | `off` (default) · `owner` · `all` — who reaches the agentic planner |
| `AGENT_OWNER_IDS` | comma-separated user uuids, used when `AGENT_ROLLOUT=owner` |
| `AGENT_SPECIALIST_MODEL` | specialist model; must be listed in `AGENT_MODELS` in `_shared/openai.ts` |

`AGENT_ROLLOUT` is **not** a secret, but it lives here because it is the one control that
turns the agentic planner on and off without an app-store release. It defaults to `off`
when absent, so forgetting to set it in cloud is the safe outcome rather than a surprise
rollout. See [AGENTIC_INTENT_SYSTEM.md](../architecture/AGENTIC_INTENT_SYSTEM.md).

## Cloud Edge Function secrets — **set**

Corrected 2026-08-21: this section previously said "not yet set / BLOCKED", which was
stale. `supabase secrets list` shows `OPENAI_API_KEY` and `GEMINI_API_KEY` present, which
is why the app has been generating tasks against cloud all along.

| Name | Purpose |
|---|---|
| `OPENAI_API_KEY` | chat + Whisper, shared by `ai-proxy` and `ai-agent` |
| `GEMINI_API_KEY` | present, but the key has **no billing account attached**, so the tier-3 Gemini fallback will fail if it is ever reached. The agentic path never uses Gemini — `AGENT_MODELS` is OpenAI-only |
| `AGENT_ROLLOUT` | **`all`** since 2026-08-21, by owner decision |
| `AGENT_SPECIALIST_MODEL` | `gpt-4o-mini` |

`supabase secrets list` prints digests, never values — safe to run and to paste.

Deployed functions: `ai-proxy`, `delete-account`, `ai-agent` (2026-08-21).

To disable the agentic planner without a deploy or an app release:

```bash
supabase secrets set AGENT_ROLLOUT=off
```

## Secret hygiene

- `.env` files are gitignored at both root and `app/`.
- `supabase/.temp/` is gitignored **at the repository root**. It contains
  `pooler-url`, which embeds the production database password. This was caught once
  already, one `git add` from a public repo.
- **Outstanding:** the OpenAI and Gemini keys appear in the retired `goodtodo` git history
  and **must be rotated**. The history now lives only in
  `d:\DEV\wowtodo\goodtodo-history-archive.bundle`, outside the repo.
