---
type: Technical Design
mode: full
work_id: ADMIN
epic_slug: admin
version: '0.1'
owner: site
status: Draft
last_updated: 2026-08-13
related:
  - docs/product/roadmap.md
  - specs/admin/TASKS.md
  - docs/ARCHITECTURE.md
---

# Technical Design — Admin hardening (ADMIN)

Technical design for ADMIN at `specs/admin/`. Architecture-wide patterns are authoritative in [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and are cited here, not repeated.

Phase 2 epic — closes the Payload admin trust gaps called out in `roadmap.md` Phase 2 and `ARCHITECTURE.md` §10.1 (CSP vs admin). Form rate limiting and repository cleanup remain separate Phase 2 work.

## 1. Scope

### In scope

| Capability                           | Description                                                                                                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users collection access control      | Explicit `access` rules on `users`: bootstrap-first-user, then authenticated-only create; authenticated read/update/delete; block anonymous REST enumeration of admin accounts.                             |
| GraphQL playground off in production | `graphQL.disablePlaygroundInProduction: true` in `payload.config.ts` so `/api/graphql-playground` is not served in production.                                                                              |
| Payload API cache headers            | Extend security cache patterns so Payload auth and API routes (`/api/users/*`, `/api/graphql`, `/api/graphql-playground`) receive auth/sensitive cache directives via `proxy.ts` (`ARCHITECTURE.md` §7.1).      |
| Access regression tests              | Unit tests for `Users` access functions (bootstrap, authenticated, anonymous) mirroring posts/recipes draft tests.                                                                                          |
| Production CSP verification          | Prod-like build smoke test documented; operator verification record (operator note on the TASKS.md item when signed off) confirming `/admin` login, navigation, and save under production security headers. |
| Architecture documentation           | Update `ARCHITECTURE.md` §7.1 and §10.1 CSP risk row; note ADR-007 verification outcome.                                                                                                                        |

### Out of scope (defer)

| Deferred item                                        | Epic / reason                                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared rate limiting on contact/subscribe            | Phase 2 separate epic — `ARCHITECTURE.md` §10.2; not admin login.                                                                                      |
| Login brute-force rate limiting in app code          | Prefer Vercel Firewall / edge rules; document as operator checklist in verification, not implement in ADMIN unless trivial middleware hook exists. |
| Multi-user RBAC, roles, 2FA                          | `roadmap.md` §6 — deferred beyond basic admin/editor.                                                                                              |
| IP allowlisting, Vercel Deployment Protection        | Platform/operator configuration; checklist only in verification.                                                                                   |
| Admin path obfuscation or separate subdomain         | Security through auth + access control, not obscurity.                                                                                             |
| CSP directive changes unless prod verification fails | Adjust only when verification proves admin broken; document exception narrowly if required.                                                        |
| `cp_session` wiring                                  | Unrelated scaffold — `ARCHITECTURE.md` §7.1.                                                                                                           |

### Capability map (for tasks skill)

| Capability                     | Suggested task theme                         |
| ------------------------------ | -------------------------------------------- |
| Users access rules             | `Users.ts` + shared access helpers           |
| GraphQL playground config      | `payload.config.ts`                          |
| Security cache patterns        | `lib/security/constants.ts` + tests          |
| Users access tests             | `users-collections.test.ts`                  |
| Prod CSP smoke script / docs   | Build verification steps                     |
| Production verification record | `TASKS.md` (dated operator note on ADMIN-05) |
| `ARCHITECTURE.md` update           | Close CSP risk / ADR-007 note                |

## 2. Architecture fit

| Concern                         | How this epic fits                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Embedded CMS monolith           | Admin UI and Payload REST/GraphQL share the Next.js app at `/admin` and `/api/*` (`ARCHITECTURE.md` §1.2). Hardening is collection access + config + existing security proxy — no new services.          |
| Trust and security (priority 1) | Strengthens `ARCHITECTURE.md` §2.1 goal: explicit auth collection rules, no public user enumeration, production-only playground disabled, admin routes non-cacheable.                                    |
| Payload auth model              | Editors authenticate via Payload `users` collection (`auth: true`); sessions signed with `PAYLOAD_SECRET` (`ARCHITECTURE.md` §5.2, §7.1). ADMIN does not introduce `cp_session`.                         |
| Existing collection access      | Posts/recipes already use `authenticated` + `publicReadPublished` (`lib/payload/access.ts`). ADMIN applies the same helper pattern to `users` with bootstrap-aware create.                           |
| Security proxy                  | `proxy.ts` already applies CSP, HSTS, and cache control to `/admin/*` (`ARCHITECTURE.md` §7.1). ADMIN extends cache pattern coverage for Payload API paths the proxy currently treats as default-public. |
| Single editor today             | Access rules assume a small set of admin accounts; no role matrix.                                                                                                                                   |

## 3. Files and components

### New

| Path                                                  | Purpose                                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/site/src/lib/payload/access-users.ts`           | Bootstrap-aware access functions: `usersCreate`, `usersRead`, `usersUpdate`, `usersDelete` (or inline in `Users.ts` if helpers stay single-use — prefer shared module if testable in isolation). |
| `apps/site/src/collections/users-collections.test.ts` | Access regression tests for Users collection config.                                                                                                                                             |
| Dated operator note on ADMIN-05 in `TASKS.md`         | Prod `/admin` under CSP, env checklist, GraphQL playground absent in prod.                                                                                                                       |

### Modified

| Path                                      | Change                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/site/src/collections/Users.ts`      | Wire `access` block using helpers from `access-users.ts` (or `access.ts` if consolidated).                                                              |
| `apps/site/src/payload.config.ts`         | Add `graphQL: { disablePlaygroundInProduction: true }`.                                                                                                 |
| `apps/site/src/lib/security/constants.ts` | Extend `DEFAULT_CACHE_PATTERNS`: add `/api/users/*`, `/api/graphql`, `/api/graphql-playground` to `authPatterns` or `sensitivePatterns` as appropriate. |
| `docs/ARCHITECTURE.md`           | §7.1 admin hardening summary; §10.1 CSP risk mitigation status; ADR-007 candidate row update.                                                           |

### Not modified

| Path                                                     | Reason                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `apps/site/src/proxy.ts`                                 | Consumes cache config from constants; no logic change unless CSP exception required after verification. |
| `apps/site/src/collections/Posts.ts`, `Recipes.ts`, etc. | Content access unchanged.                                                                               |
| `apps/site/src/app/(payload)/api/[...slug]/route.ts`     | Payload-generated REST handler; access enforced at collection layer.                                    |
| `apps/site/src/lib/session/*`                            | Not used by Payload admin.                                                                              |

## 4. Data contracts

No new Payload fields. Access function signatures:

```typescript
import type { Access } from 'payload';

/** Allow create when zero users exist (bootstrap); otherwise require authenticated admin. */
export const usersCreate: Access;

/** Authenticated only — prevents anonymous GET /api/users enumeration. */
export const usersRead: Access;

/** Authenticated only. */
export const usersUpdate: Access;

/** Authenticated only. */
export const usersDelete: Access;
```

`Users` collection config:

```typescript
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  access: {
    create: usersCreate,
    read: usersRead,
    update: usersUpdate,
    delete: usersDelete,
  },
  // admin, fields unchanged
};
```

`payload.config.ts` addition:

```typescript
export default buildConfig({
  // ...
  graphQL: {
    disablePlaygroundInProduction: true,
  },
});
```

Cache pattern extension (`DEFAULT_CACHE_PATTERNS`):

```typescript
authPatterns: [
  '/admin/*',
  '/api/auth/*',
  '/api/users/*',
  '/api/graphql',
  '/api/graphql-playground',
],
```

## 5. Runtime view

### 5.1 Anonymous visitor hits `/admin`

```text
GET /admin/
  → proxy.ts: CSP nonce, HSTS, Cache-Control: no-cache (auth pattern)
  → Payload admin layout
  → No Payload session → redirect to /admin/login
  → Login form POST → /api/users/login (Payload auth route)
  → On success: httpOnly Payload token cookie; redirect to dashboard
```

Login and logout routes are Payload internals; they do not require `users.create` access.

### 5.2 Anonymous REST probe of users

```text
GET /api/users
  → Payload REST handler
  → usersRead access → false (no req.user)
  → 403 / empty per Payload access semantics
```

### 5.3 First admin bootstrap (empty database)

```text
Operator → /admin/create-first-user (or equivalent Payload bootstrap UI)
  → usersCreate: totalDocs === 0 → true
  → User record created
  → Subsequent create attempts require authenticated session
```

### 5.4 GraphQL playground

```text
Production:
  GET /api/graphql-playground → disabled (404 or Payload error page)

Development:
  GET /api/graphql-playground → playground available for local debugging
```

### 5.5 Authenticated editor session (unchanged)

```text
Editor → /admin → edit Post → save
  → authenticated access on posts (existing)
  → afterChange hooks / revalidation (unchanged)
```

## 6. Cross-squad coordination

| Consumer             | Contract                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operators**        | Run verification protocol after deploy; confirm `PAYLOAD_SECRET` is strong (≥32 hex chars) and unique in Vercel; optional Vercel Firewall on `/api/users/login`. |
| **CI**               | New tests and config changes must pass lint, typecheck, test, build in CI.                                                                                       |
| **Future RBAC epic** | ADMIN access is all-authenticated-users-are-equal; roles plugin or custom fields deferred.                                                                       |

## 7. Error paths

| Failure                                    | Behaviour                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap create when users already exist  | `usersCreate` returns false; Payload returns forbidden — operator must use authenticated invite flow or DB seed.                                                 |
| Anonymous `/api/users` read                | Access denied; no email list leakage.                                                                                                                            |
| CSP blocks admin scripts in production     | Verification fails; investigate `proxy.ts` / `CSP_DIRECTIVES` — narrow admin-only exception only if required (`ARCHITECTURE.md` §10.1). Do not disable CSP globally. |
| `PAYLOAD_SECRET` missing in production     | Build/runtime already throws via `getPayloadSecret()` — no change.                                                                                               |
| GraphQL playground requested in production | Route disabled by Payload config; no interactive schema explorer.                                                                                                |

## 8. Observability

| Signal              | Implementation                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Verification record | `TASKS.md` (dated operator note on ADMIN-05) captures pass/fail per scenario with date and operator.                                       |
| Failed admin login  | Payload default behaviour; no new PII logging. Optional Sentry breadcrumb from existing Payload/Next integration — not required for ADMIN. |
| CSP violations      | Existing `/api/csp-report` endpoint if `SECURITY_CSP_REPORT_URI` set; review reports during verification.                                  |

## 9. Testing strategy

| Layer                                             | What to test                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit** (`users-collections.test.ts`)            | `usersCreate` returns true when `totalDocs === 0` (mock `req.payload.find`); false when anonymous and users exist; true when authenticated. `usersRead`/`update`/`delete` false without user; true with user. |
| **Unit** (`lib/security/cache` or dedicated test) | `/api/users/login`, `/api/graphql` match auth/sensitive patterns and receive non-cacheable directives.                                                                                                        |
| **Collection config**                             | `Users.access` exports all four functions; `Users.auth === true`.                                                                                                                                             |
| **Build smoke**                                   | `pnpm site:build && NODE_ENV=production pnpm start` — load `/admin/login` locally; no console CSP errors blocking render (document steps in verification).                                                    |
| **Manual / production**                           | Operator protocol in `TASKS.md` (dated operator note on ADMIN-05): login, list collections, save post, confirm GraphQL playground 404 in prod.                                                                |
| **Not tested**                                    | E2E login flow in CI against live Neon; brute-force resistance (edge platform).                                                                                                                               |

## 10. Acceptance gates

Subset of `ARCHITECTURE.md` §2.1 and `roadmap.md` Phase 2 gates this epic must satisfy:

| Gate                           | Criterion                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Users access**               | Anonymous REST cannot list users; only bootstrap or authenticated create allowed.                                       |
| **GraphQL playground**         | `/api/graphql-playground` not available in production build.                                                            |
| **Cache headers**              | Payload auth/API paths receive auth-appropriate `Cache-Control` via proxy.                                              |
| **Production admin under CSP** | Operator verification record: login, navigate, save content with production security headers enabled — pass documented. |
| **No draft/access regression** | Existing posts/recipes access tests still pass.                                                                         |
| **Quality**                    | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass locally and in CI.                                        |
| **Documentation**              | `ARCHITECTURE.md` updated; ADR-007 verification status recorded.                                                            |

## 11. Handoff

### Stable on close

- `Users` collection explicit access rules — pattern for any future auth-related collections.
- `graphQL.disablePlaygroundInProduction` — permanent production default.
- Extended `DEFAULT_CACHE_PATTERNS` for Payload API routes.
- `TASKS.md` (dated operator note on ADMIN-05) — reusable checklist for post-deploy admin security sign-off.

### Not delivered (explicit)

- Shared rate limiting on public forms (contact/subscribe).
- Application-level login rate limiting.
- RBAC, roles, 2FA, audit log.
- IP allowlisting or Vercel Deployment Protection (operator-only).
- CSP directive changes (unless verification required a documented exception).
- Automated production admin E2E in CI.

### Next epic

- **Phase 2 form rate limiting** — shared store for contact/subscribe (`roadmap.md` Phase 2).
- **Phase 2 repository cleanup** — dead config, unused deps (`ARCHITECTURE.md` §10.2).

## 12. Open questions

1. **Access helper location.** Colocate bootstrap logic in `lib/payload/access-users.ts` vs extend `access.ts`? Default: separate file to keep auth-collection rules isolated; merge only if file is trivial. Owner: implementer; non-blocking.

2. **Self-only vs admin update on users.** Should `usersUpdate` allow any authenticated user to edit any user record, or restrict to `id === user.id`? Default: any authenticated admin (single-editor site); tighten when RBAC epic lands. Owner: product; non-blocking.

3. **CSP exception scope.** If prod verification fails, is a route-specific CSP relax acceptable for `/admin/*` only? Default: yes, narrowly scoped; document in `ARCHITECTURE.md` and ADR-007. Owner: operator + implementer during verification; blocking only if verification fails.

4. **Epic ID.** `ADMIN` — unique across `specs/*`. Owner: product; non-blocking.
