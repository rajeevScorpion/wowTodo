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

## Cloud Edge Function secrets — **not yet set**

Required before the proxy works in production. Without them `ai-proxy` returns `503`.

```bash
supabase secrets set OPENAI_API_KEY=... GEMINI_API_KEY=...
supabase functions deploy ai-proxy
```

**Status: BLOCKED** — deliberately not executed. No remote/production change has been made
without owner approval.

## Secret hygiene

- `.env` files are gitignored at both root and `app/`.
- `supabase/.temp/` is gitignored **at the repository root**. It contains
  `pooler-url`, which embeds the production database password. This was caught once
  already, one `git add` from a public repo.
- **Outstanding:** the OpenAI and Gemini keys appear in the retired `goodtodo` git history
  and **must be rotated**. The history now lives only in
  `d:\DEV\wowtodo\goodtodo-history-archive.bundle`, outside the repo.
