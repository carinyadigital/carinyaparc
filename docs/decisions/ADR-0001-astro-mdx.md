# ADR-0001 — Astro + MDX

**Status:** Accepted — 2026-09-21

The public site is an Astro static site. Content is MDX and YAML in the repository, checked on every build. React islands handle the forms and the consent banner. There is no database and no admin UI. Merging to `main` publishes.
