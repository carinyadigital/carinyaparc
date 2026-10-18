# AGENTS.md

Guidance for coding agents on the Carinya Parc website. This file is the agent entry point. How the system is built lives in `docs/ARCHITECTURE.md`. The engineering rules live in `docs/PRINCIPLES.md`. Do not restate either document here.

`AGENTS.md`, `PRINCIPLES.md` and `ARCHITECTURE.md` MUST NOT be changed without explicit permission.

## Overview

Carinya Parc ([carinyaparc.com.au](https://carinyaparc.com.au)) is a regenerative farm in The Branch, NSW. This repository is a pnpm and Turborepo monorepo. The site is `apps/web`. Content is files in `content/`. There is no database.

Also read `docs/product/product.md`, `docs/product/roadmap.md`, `brand/voice.md`, `apps/web/README.md`, and `apps/web/.env.example`.

## Setup

Node 24.16.0 (`.nvmrc`) and pnpm 10.26.0. No database and no Docker.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
```

`PUBLIC_SITE_URL` is the only value a local build needs. Other keys are optional.

## Commands

Run these from the repository root before finishing. CI runs the same checks.

```bash
pnpm web:dev          # http://localhost:4321, drafts visible
pnpm lint
pnpm typecheck
pnpm format:check     # pnpm format writes
pnpm test
pnpm build
```

After `pnpm web:build`, run `pnpm --filter web test:dist`. To focus a test, run `pnpm --filter web exec vitest run src/lib/api` or add `-t "name"`.

## Code style

Follow `docs/PRINCIPLES.md`. Match the file you are editing. Keep the diff to the task.

## Security

Do not commit secrets. Do not log personal data. Do not weaken validation, rate limiting, or security headers so a check can pass.

## Pull requests

Content edits stay under `content/`. The content contract is in `docs/ARCHITECTURE.md`. Branch from `main` and open a pull request. A human merges. Merging to `main` publishes the site.

When a user-visible feature changes, update the relevant doc under `docs/` in the same change. Record technical debt only in `docs/ARCHITECTURE.md` §11.
