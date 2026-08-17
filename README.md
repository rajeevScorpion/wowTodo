# WowTodo

Monorepo for **WowTodo** — an AI-powered task planner. Users describe tasks by voice or text, and AI decomposes them into actionable todo lists with grouping, branching, reminders and sharing.

This repository holds two independent projects that ship together but share no code and no dependency resolution.

| Folder | What it is | Stack |
|---|---|---|
| [`app/`](app/) | The WowTodo mobile application — the product | Expo ~54 / React Native 0.81.5 / React 19.1, Expo Router, Supabase, Tamagui |
| [`web/`](web/) | The promotional marketing website | Vite 6 / React 19, React Router 7, Tailwind CSS v4 |

Each folder has its own `package.json` and lockfile. There is deliberately **no root `package.json` and no workspace tooling** — hoisting dependencies is a common cause of broken React Native/Expo builds, and the two projects have nothing to share.

## Documentation

Full documentation lives in [`docs/`](docs/). Start with:

- [Current State](docs/project/CURRENT_STATE.md) — what works, what's broken, what's unverified
- [Product Overview](docs/product/PRODUCT_OVERVIEW.md) — what WowTodo is
- [Windows Setup](docs/engineering/WINDOWS_SETUP.md) → [Build and Run](docs/engineering/BUILD_AND_RUN.md)
- [Defect Register](docs/testing/DEFECT_REGISTER.md) — open issues by severity

## Getting started

Prerequisites: Node.js (this repo has been used with v22.17.0) and, for the app, a working Android SDK + emulator.

### `app/` — the mobile application

```bash
cd app
npm install                 # runs patch-package via postinstall
cp .env.example .env        # then fill in real values — never commit .env
npx expo start              # press a / i / w for Android / iOS / web
npx expo run:android        # native Android build
```

See [`app/CLAUDE.md`](app/CLAUDE.md) for the full architecture reference, [`app/context/`](app/context/) for feature design docs, and [`app/migrations/`](app/migrations/) for the Supabase schema, migrations and rollbacks.

### `web/` — the marketing site

```bash
cd web
npm ci
npm run dev                 # http://localhost:3000
npm run lint                # tsc --noEmit
npm run build               # outputs web/dist
```

`web/` is a client-side SPA using `BrowserRouter`. Hosting it requires a rewrite-all-to-`index.html` rule so `/pricing`, `/privacy` and `/terms` resolve on direct load.

## Secrets

Never commit real credentials. The root [`.gitignore`](.gitignore) ignores `.env`, `.env.*`, keystores, provisioning profiles and service-account files across every subdirectory; only `.env.example` files are tracked.

Note that the app's AI keys currently use the `EXPO_PUBLIC_` prefix, which inlines them into the shipped bundle — see the warning in [`app/.env.example`](app/.env.example).

## Repository layout

```
wowTodo/
├─ app/                     # Expo / React Native application
├─ web/                     # Vite marketing site
├─ AI_CODER_PROMPTS/        # AI-coder governance and prompt packs
│  └─ WOWTODO_REVIVAL_V1/
├─ .gitignore               # repo-wide, secret-hardened
└─ README.md
```

## Project history

`app/` was developed in a separate repository (`rajeevScorpion/goodtodo`, private, 51 commits on `master`) and imported here as a working-tree snapshot on 2026-08-17. That repository remains the historical record; its commit history was intentionally **not** grafted into this repo. See [`AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/`](AI_CODER_PROMPTS/WOWTODO_REVIVAL_V1/) for the audit trail and the outstanding decision on history import.

`web/` was previously the entire contents of this repository and was moved into `web/` with its git history preserved.
