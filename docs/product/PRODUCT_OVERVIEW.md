# Product Overview

## What WowTodo is

A **voice-first, AI-assisted todo and productivity app**. The user speaks naturally and
receives useful *structured* todo items, instead of typing and manually decomposing every
task.

> "Plan a launch party for next Friday and order the cake"
> → Task: *Launch Party* · 7 ordered todos, dated, grouped, reminders scheduled

Typing is fully supported and uses the same AI decomposition path. Voice is the
differentiator, not the only route.

## The core insight

The product value is **not transcription accuracy**. It is the *interpretation* step:
turning loose spoken intent into a plan with the right granularity, sensible ordering,
extracted dates, and a sensible group. Transcription is a solved commodity (Whisper);
planning is where the product competes.

Per the pack's `00_MASTER_CONTEXT`, the current improvement direction is explicitly
**better intent understanding and task planning**, not better speech-to-text. See
prompt 210 for the planned agentic design — which is *planned*, not implemented.

## Core features

| Feature | Role |
|---|---|
| **Voice capture → todos** | The differentiating loop |
| **AI decomposition** | Task title, description, ordered todos, dates, group suggestion |
| **Tasks & todos** | The primary data objects |
| **Reminders** | Up to 3 configurable daily slots; local notifications |

## Supplementary features

| Feature | Role |
|---|---|
| **Task groups** | User-defined categories; AI suggests one at creation |
| **Branches** | Turn any todo into its own sub-task with its own todos; parent completion auto-syncs |
| **Sharing** | Share a task with another user — pending → accepted/rejected/revoked, with a "peek" before accepting |
| **In-app notifications** | Share lifecycle events, delivered over Supabase Realtime |
| **People** | Collaborator directory and per-person shared task views |
| **Analytics** | Completion dashboard |
| **Profiles** | Name, avatar, DOB, profession, city, bio |
| **Theming** | Neumorphic design system, light/dark/system |

Verification status per feature: [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md).

## Platform

Android first (Google Play). iOS is supported by the stack but has never been built.
The [`web/`](../../web/) folder is a **promotional marketing site only** — it shares no
code with the app and is not a web version of the product.

## What WowTodo is not

- Not a calendar or a full project manager.
- Not offline-first — it needs a network for AI decomposition.
- Not multi-tenant/team software; sharing is person-to-person.
