---
type: Tasks
epic: admin
epic_id: ADMIN
version: '0.1'
owner: site
status: Not started
last_updated: 2026-08-13
related:
  - specs/admin/tdd.md
  - docs/ARCHITECTURE.md
  - docs/product/roadmap.md
---

# Tasks — Admin hardening (ADMIN)

Task breakdown for the admin hardening design. Canonical AC lives here. Design: [`./tdd.md`](tdd.md).

## 1. Summary

- **Epic.** ADMIN — Admin hardening (Payload admin trust gaps)
- **Phase / Priority.** Phase 2 · P1
- **Estimate.** 13 points across 6 tasks
- **Depends on.** CI (lint/typecheck/test/build gate); shipped Payload access pattern (`lib/payload/access.ts`)
- **Scope.** Users-collection access control, GraphQL playground off in production, Payload API cache headers, access regression tests, production CSP verification, and the matching `ARCHITECTURE.md` update. See tdd.md §1 for out-of-scope items (rate limiting, RBAC, IP allowlisting).
- **MVP.** ADMIN-01 — anonymous REST cannot enumerate admin users.

## 2. Conventions

| Convention | Value                                |
| ---------- | ------------------------------------ |
| Task ID    | `ADMIN-{nn}` — never reused          |
| Acceptance | Gherkin per task                     |
| Estimate   | Fibonacci story points               |
| Paths      | `apps/site/src/...` (`ARCHITECTURE.md`) |

## 3. Tasks

- [ ] **[ADMIN-01]** Users collection access control — `apps/site/src/lib/payload/access-users.ts`, `apps/site/src/collections/Users.ts` · P0 · Est 5 · Depends: —
  - Bootstrap-aware `usersCreate`; authenticated-only `usersRead`/`usersUpdate`/`usersDelete`; wire into `Users.access`. tdd.md §3, §4.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Anonymous REST cannot list users
      Given no authenticated session
      When GET /api/users is requested
      Then access.read denies the request
      And no user email addresses are returned

    Scenario: First-user bootstrap allowed on empty database
      Given zero user records exist
      When a create is attempted
      Then usersCreate returns true

    Scenario: Create requires auth once a user exists
      Given at least one user record exists
      And the request is unauthenticated
      When a create is attempted
      Then usersCreate returns false
    ```

- [ ] **[ADMIN-02]** Disable GraphQL playground in production — `apps/site/src/payload.config.ts` · P1 · Est 1 · Depends: —
  - Add `graphQL.disablePlaygroundInProduction: true`. tdd.md §4.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Playground disabled in production
      Given NODE_ENV is production
      When GET /api/graphql-playground is requested
      Then the interactive playground is not served

    Scenario: Playground available in development
      Given NODE_ENV is development
      When GET /api/graphql-playground is requested
      Then the playground is available
    ```

- [ ] **[ADMIN-03]** Payload API/auth cache headers — `apps/site/src/lib/security/constants.ts` · P1 · Est 2 · Depends: —
  - Extend `DEFAULT_CACHE_PATTERNS` so `/api/users/*`, `/api/graphql`, `/api/graphql-playground` receive auth/sensitive (non-cacheable) directives via `proxy.ts`. tdd.md §4, §5.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Payload auth routes are non-cacheable
      Given the security cache patterns
      When /api/users/login is matched
      Then it receives an auth-appropriate no-store/no-cache directive
    ```

- [ ] **[ADMIN-04]** Users access regression tests — `apps/site/src/collections/users-collections.test.ts` · P1 · Est 2 · Depends: ADMIN-01
  - Unit tests for the four access functions (bootstrap, authenticated, anonymous) mirroring the posts/recipes draft tests; assert `Users.auth === true` and all four access functions exported. tdd.md §9.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Access functions behave per rule
      Given the Users collection config under test
      When each access function is evaluated for anonymous and authenticated requests
      Then usersRead/update/delete are false without a user and true with one
      And usersCreate is true only when no users exist or the request is authenticated
    ```

- [ ] **[ADMIN-05]** Production CSP verification record — `specs/admin/TASKS.md` (dated operator note on this task) · P1 · Est 2 · Depends: ADMIN-01, ADMIN-02, ADMIN-03
  - Operator protocol + record: `/admin` login, navigation, and save under production security headers; GraphQL playground absent in prod; env checklist (`PAYLOAD_SECRET` strong/unique). tdd.md §10, §11.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Admin verified under production CSP
      Given a production-equivalent build with CSP enabled
      When an operator logs in, navigates, and saves a post
      Then all steps succeed with no CSP error blocking render
      And the outcome is recorded as a dated operator note on ADMIN-05 with date and operator
    ```

- [ ] **[ADMIN-06]** Documentation — `docs/ARCHITECTURE.md` · P2 · Est 1 · Depends: ADMIN-05
  - Update §7.1 (admin hardening summary), §10.1 (CSP-vs-admin risk mitigation status), and the ADR-007 candidate row with the verification outcome. tdd.md §10.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Architecture reflects admin hardening
      Given ARCHITECTURE.md after this epic
      When §7.1 and §10.1 are read
      Then the admin access rules and CSP verification outcome are recorded
    ```

## 4. Dependencies and Definition of Done

```text
ADMIN-01 ──> ADMIN-04
ADMIN-01, ADMIN-02, ADMIN-03 ──> ADMIN-05 ──> ADMIN-06
```

- **DoD:** all Gherkin passes; existing posts/recipes access tests still green; `pnpm lint/typecheck/test/build` green; `ARCHITECTURE.md` updated; ADR-007 status recorded.

## 5. Handoff

Leaves explicit Users access rules, production-off GraphQL playground, non-cacheable Payload API routes, and a reusable admin verification checklist. RBAC, 2FA, and form rate limiting remain separate future work (tdd.md §11).
