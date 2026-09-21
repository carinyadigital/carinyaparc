# Specs

Short-lived working docs for open work, one folder per domain. They are
not part of the durable documentation set: do not link them from `docs/`,
`AGENTS.md`, code, or comments. GitHub issues replace filesystem
`TASKS.md` as the issue source: intake, Gherkin AC, and assignment live
on the issue. Issues may link here for design context.

```text
specs/{domain}/
└── tdd.md      # Technical design (from tdd skill)
```

Existing `TASKS.md` files are the current checklist. Cut them over to
GitHub issues and delete them so the source is not split.

| Domain               | Status     | Notes                                                     |
| -------------------- | ---------- | --------------------------------------------------------- |
| [`blog/`](blog/)     | Open (ops) | MailerLite welcomes + GA4 funnels; reader surface shipped |
| [`media/`](media/)   | Open       | Media library                                             |
| [`site/`](site/)     | Open       | Remaining site hardening                                  |

Canonical product/architecture docs stay under `docs/`. Slack `#site` is
standup, not intake.
