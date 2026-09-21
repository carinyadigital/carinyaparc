---
type: Technical Design
mode: skeleton
work_id: AGENTS
epic_slug: agents
version: '0.2'
owner: product
status: Draft
last_updated: 2026-08-13
related:
  - specs/agents/SPEC.md
  - specs/agents/TASKS.md
  - docs/ARCHITECTURE.md
  - docs/ARCHITECTURE.md
---

# Technical Design — Site product-manager (AGENTS)

Technical design for AGENTS at `specs/agents/`. Team intent is
[`SPEC.md`](SPEC.md). Site-app patterns stay in
[`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md). This epic is mostly
**outside** `apps/site`.

## 1. The slice

Prove one unattended weekday path: the **lead** fans out to four
sub-agents, reads their reports, and posts a standup to Slack `#site`. The
lead does not fetch issues, PRs, Slack history, or the tree itself.

Portable definition: `agents/product-manager/` (coordinator +
`subagents/`). Built/published with installable `@carinya/agent` targeting
**cursor**, roster mapped to `customSubagents`.

**Does not yet work (and is out of this epic):** `sentry-analyst`;
implementer / Loop C; `content-marketer` move; a filesystem `TASKS.md`
alongside GitHub issues; `autoCreatePR`; Vercel or Payload writes; Claude
overlay on this team; per-sub-agent MCP isolation on Cursor (platform
limit — see §2).

## 2. Files

```text
# carinyaparc/agents — compiler
packages/agent/package.json                    EVOLVE  installable bin → compiled JS
packages/agent/src/cli.ts                      EVOLVE  deploy --provider cursor
packages/agent/src/providers/cursor.ts         EVOLVE  Cloud Agents API + customSubagents
packages/agent/src/publish/cursor.ts           NEW     POST https://api.cursor.com/v1/agents
packages/agent/src/providers/index.ts          EVOLVE  cursor.supports.multiagent = true
packages/agent/tests/publish-cursor.test.ts    NEW     fake API: roster inlined, dry-run
README.md / AGENTS.md                          EVOLVE  Cursor is a deploy target; coordinators allowed

# carinyaparc/carinyaparc — definition
agents/product-manager/agent.yaml              NEW     multiagent roster; providers.cursor; Slack only
agents/product-manager/instructions.md         NEW     fan-out, do not fetch, one action = post
agents/product-manager/connectors/slack.yaml   NEW     lead post to #site
agents/product-manager/schedules/standup.yaml  NEW     0 8 * * 1-5 Australia/Sydney
agents/product-manager/subagents/issue-analyst/    NEW  GitHub issues connector + instructions
agents/product-manager/subagents/pr-analyst/       NEW  GitHub PRs connector + instructions
agents/product-manager/subagents/slack-analyst/    NEW  Slack read; never post
agents/product-manager/subagents/codebase-analyst/ NEW  no extra connector; clone is enough
agents/product-manager/dist/cursor/            NEW     committed payload
package.json                                   EVOLVE  agent:validate / agent:build / agent:build:check
.github/workflows/agent-ci.yml                 NEW     paths: agents/**
.github/workflows/agent-deploy.yml             NEW     workflow_dispatch; dry-run default true
pnpm-workspace.yaml                            KEEP    do not add agents/
docs/ARCHITECTURE.md                 EVOLVE  agents/ tree (when this ships)

# carinyaparc/carinya-plugins
product-management/skills/                     EVOLVE  must exist
```

`@carinya/agent` via git path or GitHub Packages. Do not upgrade this repo
to pnpm 11. `agents/` is not a workspace package.

### Cursor artifacts

Replace the fictional `triggers` / `scope` / `prompts` renderer.

```text
agents/product-manager/dist/cursor/
  agent.json                 # create body: model, repos[], mcpServers[], customSubagents[], autoCreatePR: false
  automations/standup.json   # cron + timezone + prompt.text
```

`customSubagents[]`: `{ name, description, prompt }` from each
`subagents/<name>/` (instructions.md → `prompt`). Names must not collide
with built-ins: `explore`, `debug`, `shell`, `computerUse`.

`mcpServers`: **union** of lead + sub-agent connectors (url → `http`,
stdio → `stdio`). Secrets stay `${VAR}`. Document in the renderer comment
that Cursor does not yet isolate MCP per sub-agent; `agent.yaml` still
declares connectors on the agent that owns them.

`repos`: `[{ "url": "https://github.com/carinyaparc/carinyaparc.git", "startingRef": "main" }]`.

`autoCreatePR`: false.

### Publisher

Same sequence as Claude in spirit, different API: one `POST /v1/agents`
with the roster **inlined** (no separate sub-agent ids). Dry-run prints the
body. Live deploy: `CURSOR_API_KEY`, refuse stale dist/ and unresolved
`${VAR}`. Clock: Automations if writable; else GitHub UTC cron.

### Permissions

Cursor cannot express per-connector `ask`. Each definition uses
`permissions.default: allow` on **its** connectors only. Lead: Slack.
`issue-analyst` / `pr-analyst`: GitHub. `slack-analyst`: Slack.
`codebase-analyst`: none.

## 3. Acceptance gates

### 3.1 End-to-end path

- `@carinya/agent` CLI runs from a throwaway folder.
- `pnpm agent:build:check` passes. `agent.json` `customSubagents` has four
  names: `issue-analyst`, `pr-analyst`, `slack-analyst`, `codebase-analyst`.
- Dry-run `autoCreatePR` is false; `repos[0]` is `carinyaparc/carinyaparc`.
- One dispatched run: four legs report (or the standup names a failed
  leg); lead posts to `#site`; no PR opened.

### 3.2 Observability

- Publisher logs run / agent id (no tokens, no Slack bodies).
- A missing GitHub or Slack credential is visible as a failed leg in the
  standup, not as a successful empty board invented by the lead.

### 3.3 Error path

- Stale `dist/` → deploy refuses.
- Unresolved `${VAR}` → no POST.
- Roster name colliding with `explore` / `debug` / `shell` / `computerUse`
  → build fails.
- Lead `agent.yaml` declaring a GitHub connector → fail the review (and a
  test if we can express "lead connectors ⊆ slack").

### 3.4 Scaffolds

- Agents repo: vitest for cursor render + publish, including roster.
- This repo: path-filtered agent-ci; Quality checks unchanged.
- `pnpm-workspace.yaml` omits `agents/`.

## 4. What this epic did NOT deliver

- `sentry-analyst` and Sentry MCP.
- Per-sub-agent MCP isolation on Cursor (platform).
- Implementer agent, Loop C, Ralph loop.
- Moving `content-marketer`.
- Spec-only PRs (`autoCreatePR` stays false).
- Claude provider overlay on `product-manager`.

**Stable on close:** compiler publishes a Cursor coordinator; this repo
owns the desk definition; standup is synthesised from reports.

## 5. Open questions

1. **carinya-plugins on Cloud Agents.** Team marketplace vs committed refs
   vs fail-closed. Blocks Loop A quality. Owner: engineering.
2. **Automations write API?** Blocks timezone-correct clock. Owner:
   engineering (spike).
3. **Standup hour.** 08:00 Sydney proposed. Owner: operator.
4. **Labels vs comments.** Default v1: `issue-analyst` comments only unless
   operator allows labels. Owner: operator.
5. **Slack MCP / `#site` id.** Owner: engineering.
6. **Package channel.** Git path is enough for AGENTS-01.
7. **product-management stub.** Blocks naming those skills. Owner: plugins.
8. **MCP union.** Confirm sub-agents can use GitHub when servers are
   parent-scoped. If a sub-agent cannot see MCP, we need a different
   runtime split. Owner: engineering (first dry-run).

## 6. Handoff

Next: Loop B (same roster, second schedule), then `sentry-analyst` as a
fifth fan-out leg, then Loop C (assign). Package split and coordinator
shape do not get revisited.
