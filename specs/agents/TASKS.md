---
type: Tasks
epic: agents
epic_id: AGENTS
version: '0.2'
owner: product
status: Draft
last_updated: 2026-08-13
related:
  - specs/agents/SPEC.md
  - specs/agents/tdd.md
  - docs/ARCHITECTURE.md
---

# Tasks — Site product-manager (AGENTS)

Filesystem checklist until AGENTS-09 replaces it with GitHub issues. Design:
[`tdd.md`](tdd.md). Intent: [`SPEC.md`](SPEC.md).

Work spans **three GitHub repos**. Task titles name the repo. Do not treat
this list as `apps/site` work.

## 1. Summary

- **Epic.** AGENTS — Site product-manager on Cursor Cloud
- **Priority.** P0 for the standup path; P1 refine; P2 assign
- **Estimate.** 37 points across 9 tasks
- **Depends on.** Cursor account with Cloud Agents + GitHub connected;
  Slack `#site`; Cursor API key
- **MVP.** AGENTS-05 — lead fans out to four researchers, then posts `#site`
- **Out of this list:** migrate `content-marketer`; flatten to a solo PM;
  `sentry-analyst`; implementer agent; Vercel/Payload writes; pnpm 11
  upgrade on this repo

## 2. Conventions

| Convention | Value                        |
| ---------- | ---------------------------- |
| Task ID    | `AGENTS-{nn}` — never reused |
| Priority   | P0 (blocking) → P2 (later)   |
| Acceptance | Gherkin required per task    |
| Checkbox   | `[ ]` open · `[x]` done      |
| Estimate   | Fibonacci story points       |

## 3. Prioritised checklist

Work top-to-bottom within each tier unless a dependency blocks progress.

### P0 — Publisher, definition, first standup

- [ ] **[AGENTS-01] Make `@carinya/agent` installable**
  - **Repo:** `carinyaparc/agents` | **Status:** Open | **Priority:** P0 | **Estimate:** 5
  - **Depends on:** —
  - **Deliverable:** Package bin runs without the monorepo `tsx` wrapper.
    `private`/publish channel documented. README describes a compiler (and
    `content-marketer`), not the site team.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: CLI runs from a throwaway folder
      Given a temp directory with no clone of carinyaparc/agents except the package
      When the package is installed via the documented channel
      And `agent --help` (or equivalent) is invoked
      Then the process exits 0
      And it does not require a sibling tsx script from the agents repo root

    Scenario: README does not claim this repo holds the site desk
      Given the agents repo README
      Then it does not instruct readers to add agents/product-manager here
    ```

- [ ] **[AGENTS-02] Cursor renderer matches Cloud Agents API**
  - **Repo:** `carinyaparc/agents` | **Status:** Open | **Priority:** P0 | **Estimate:** 5
  - **Depends on:** AGENTS-01 (can land in the same PR)
  - **Deliverable:** `providers/cursor.ts` emits Cloud Agents `agent.json` +
    `automations/<schedule>.json` per tdd.md §2. `supports.multiagent` is
    **true**. Roster becomes `customSubagents` `{name, description, prompt}`.
    Built-in name collisions (`explore`, `debug`, `shell`, `computerUse`)
    fail the build. Tests lock field names.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Rendered payload is a Cloud Agents create body
      Given a fixture coordinator with two subagents and one schedule
      When cursor.render is called
      Then agent.json contains repos, mcpServers, customSubagents, and autoCreatePR
      And autoCreatePR is false
      And customSubagents has two entries with name, description, and prompt
      And the file does not use keys triggers, scope, or prompts

    Scenario: Built-in subagent names are rejected
      Given a subagent directory named "explore"
      When build runs for cursor
      Then the build fails with a named error
    ```

- [ ] **[AGENTS-03] `deploy --provider cursor`**
  - **Repo:** `carinyaparc/agents` | **Status:** Open | **Priority:** P0 | **Estimate:** 5
  - **Depends on:** AGENTS-02
  - **Deliverable:** `publish/cursor.ts` + CLI. Dry-run prints POST
    `https://api.cursor.com/v1/agents` and unset `${VAR}`s. Live deploy
    refuses stale dist/ and unresolved vars. Vitest against a fake API.
    Workflow choice `cursor` added beside `claude`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Dry-run does not call the network
      Given CURSOR_API_KEY is unset
      When `agent deploy --provider cursor --dry-run` runs
      Then exit code is 0
      And output lists the POST path and any unset placeholders
      And no HTTP request is made

    Scenario: Live deploy refuses stale dist
      Given dist/cursor differs from a fresh render
      When `agent deploy --provider cursor` runs without --dry-run
      Then the process exits non-zero
      And no POST is made
    ```

- [ ] **[AGENTS-04] product-management skills exist in carinya-plugins**
  - **Repo:** `carinyaparc/carinya-plugins` | **Status:** Open | **Priority:** P0 | **Estimate:** 3
  - **Depends on:** —
  - **Deliverable:** `product-management` plugin contains the skill
    directories its plugin.json already names (`stakeholder-update`,
    `backlog-refine`, `tasks`, …), not only `.cursor-plugin/plugin.json`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Named PM skills are files
      Given a clone of carinya-plugins at the marketplace commit we will pin
      When product-management/skills/stakeholder-update/SKILL.md is read
      Then the file exists
      And backlog-refine and tasks skills exist the same way
    ```

- [ ] **[AGENTS-09] Cut over TASKS.md to GitHub issues**
  - **Repo:** `carinyaparc/carinyaparc` | **Status:** Open | **Priority:** P0 | **Estimate:** 3
  - **Depends on:** —
  - **Deliverable:** Replace filesystem `TASKS.md` with GitHub issues: one
    issue per open checkbox in `specs/*/TASKS.md`. Title keeps the old id
    (`[SITE-01] …`). Body keeps Gherkin. Delete all `specs/*/TASKS.md`.
    Update `specs/README.md`. First live standup depends on this so the
    source is not split.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: One issue source
      Given a clone of carinyaparc/carinyaparc at main after this task
      Then no specs/**/TASKS.md file exists
      And each previously open checkbox has a GitHub issue whose title contains its id
    ```

- [ ] **[AGENTS-05] `agents/product-manager` in this repo + first standup**
  - **Repo:** `carinyaparc/carinyaparc` | **Status:** Open | **Priority:** P0 | **Estimate:** 8
  - **Depends on:** AGENTS-01, AGENTS-02, AGENTS-03, AGENTS-04, AGENTS-09
  - **Deliverable:** Coordinator definition: lead (Slack only) +
    `issue-analyst`, `pr-analyst`, `slack-analyst`, `codebase-analyst`.
    Standup schedule, committed `dist/cursor/` with four `customSubagents`.
    Root agent scripts, `agent-ci.yml`, `agent-deploy.yml` (dry-run default
    true). One dispatch: lead posts to `#site` after reports. `autoCreatePR:
false`. Not in `pnpm-workspace.yaml`.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Definition builds in this checkout
      Given @carinya/agent is a dependency of the repo root
      When `pnpm agent:build:check` runs
      Then exit code is 0
      And agent.json customSubagents names are issue-analyst, pr-analyst, slack-analyst, codebase-analyst
      And the lead agent.yaml connectors do not include github

    Scenario: Agent CI is path-filtered
      Given a PR that does not touch agents/**
      Then agent-ci.yml does not have to run
      And the existing Quality checks workflow is unchanged

    Scenario: First live standup is synthesised, not scraped by the lead
      Given Slack #site and GitHub credentials in the Cursor deploy environment
      When agent-deploy is dispatched with dry-run false for schedule standup
      Then a message appears in #site
      And it cites at least one issue number or PR, or states the board is empty
      And it does not invent work from Slack chat without an issue
      And no pull request is opened by the run

    Scenario: Workspace graph ignores agents/
      Given pnpm-workspace.yaml
      Then it does not include agents/**
    ```

### P1 — Clock and weekly refine

- [ ] **[AGENTS-06] Attach the weekday clock**
  - **Repo:** `carinyaparc/carinyaparc` (and agents publisher if Automations
    API exists) | **Status:** Open | **Priority:** P1 | **Estimate:** 3
  - **Depends on:** AGENTS-05
  - **Deliverable:** Recurring standup without a human dispatch. Prefer
    Cursor Automations with `Australia/Sydney`. Fallback: GitHub Actions
    `schedule` documenting the UTC equivalent and DST limitation (tdd.md §5).
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Standup runs on a weekday without workflow_dispatch
      Given the clock is attached
      When the next 08:00 Australia/Sydney weekday arrives (or the documented UTC fallback)
      Then a Cloud Agent run starts with the standup prompt
      And #site receives a post
    ```

- [ ] **[AGENTS-07] Weekly backlog-refine schedule**
  - **Repo:** `carinyaparc/carinyaparc` | **Status:** Open | **Priority:** P1 | **Estimate:** 3
  - **Depends on:** AGENTS-05
  - **Deliverable:** `schedules/backlog-refine.yaml` (Monday 09:00 Sydney).
    Instructions: same roster; lead uses `backlog-refine`; comments via
    `issue-analyst`. Source is GitHub issues. Rebuild dist/.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Refine writes to the issue source
      Given a refine schedule prompt
      When the run completes
      Then findings are in #site and/or GitHub issue comments
      And no filesystem TASKS.md is written
    ```

### P2 — Later (not this slice)

- [ ] **[AGENTS-08] Assign work to another agent**
  - **Repo:** `carinyaparc/carinyaparc` | **Status:** Open | **Priority:** P2 | **Estimate:** 2
  - **Depends on:** AGENTS-05, AGENTS-07, a second definition that does not
    exist yet
  - **Deliverable:** Spec-only: document the assignment interface (GitHub
    issue with AC + trigger of another Cloud Agent). No implementer
    definition in this epic.
  - **Acceptance (Gherkin):**

    ```gherkin
    Scenario: Assignment interface is written down
      Given specs/agents/SPEC.md Loop C
      When AGENTS-08 closes
      Then the issue fields required to trigger an implementer are listed
      And no implementer agent.yaml is required in this epic
    ```

## 4. Dependency graph

```text
AGENTS-01 ─┬─► AGENTS-02 ─► AGENTS-03 ─┐
           │                           ├─► AGENTS-05 ─┬─► AGENTS-06
AGENTS-04 ─┴───────────────────────────┤              └─► AGENTS-07 ─► AGENTS-08 (later)
AGENTS-09 ─────────────────────────────┘
```

## 5. Out of scope (do not add back)

- Move `agents/content-marketer/` into this repo
- `providers.claude` on `product-manager`
- `autoCreatePR: true` / spec-file PRs from the PM
- Merging carinya-plugins or `@carinya/agent` into `packages/`
- Putting `agents/` on Turbo or the Vercel build
- Flatten the desk into a solo PM that gathers and posts
- `sentry-analyst` in this epic (joins the fan-out later)
- Keep a filesystem `TASKS.md` alongside GitHub issues
- Slack as intake (chat is not an issue)
