# Carinya Parc Website

Website for [Carinya Parc](https://carinyaparc.com.au) — a regenerative farm in Australia.

## Features

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4** (`apps/site`, currently production)
- **Astro 7** + **MDX** public site (`apps/web`, scaffolded alongside `apps/site`)
- **Payload CMS** + **MDX** with **PostgreSQL**
- **pnpm** + **Turborepo** monorepo, deployed on **Vercel**

## Documentation

For project documentation, see [`docs/`](docs/).

## Getting started

**Requirements:** Node `24.16.0` (see `.nvmrc`), pnpm `10.26.0`, Docker (for local Postgres).

```bash
pnpm install
cp apps/site/.env.example apps/site/.env.local   # fill in secrets
docker compose -f apps/site/docker-compose.yml up -d
pnpm site:dev
```

- Public site: [http://localhost:3000](http://localhost:3000)
- Payload admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Astro scaffold: `pnpm web:dev` → [http://localhost:4321](http://localhost:4321)

## Quality checks

Run from the repo root before merge.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## License

This project is available under the MIT license. It is freely available for any agricultural business to copy, modify, and deploy for their own farm website.
