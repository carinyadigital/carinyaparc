---
title: Carinya Parc – Product Overview
status: active
owner: product
last_updated: 2026-05-31
---

## Overview

Carinya Parc is a working rural property in New South Wales that hosts short-stay guests and showcases regenerative agriculture in practice.  
The Carinya Parc website is the primary digital touchpoint for guests, partners, and the local community to discover the property, understand its values, and plan visits or future engagements.

This document describes the product vision for Carinya Parc as expressed through the website, so that product, engineering, and AI agents can make consistent decisions.

| Doc                                                           | Role                                              |
| ------------------------------------------------------------- | ------------------------------------------------- |
| **This document**                                             | What and why — vision, scope, features, non-goals |
| [`product/roadmap.md`](roadmap.md)                            | When — phased delivery                            |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md)                       | How and where — architecture, routes, content; debt in §10 only |
| [`PRINCIPLES.md`](../PRINCIPLES.md)                           | Engineering rules                                 |

---

## Purpose & Vision

The purpose of Carinya Parc is to:

- **Share a lived example of regenerative agriculture and land stewardship.**
- **Offer restorative short-stay experiences on a working farm.**
- **Build a community around good food, soil health, and rural life.**
- **Create a foundation for future offerings** (workshops, events, produce, digital content).

The website's vision is to:

- **Present Carinya Parc as an authentic, grounded, not-over-produced farm destination.**
- **Help visitors quickly understand "Is this for me?" and "How do I experience this place?".**
- **Grow an engaged audience and repeat guests who care about regenerative practices.**
- **Serve as the canonical source of truth** for stories, updates, and practical visiting information.

## Design Principles

These principles should guide content and UX decisions:

- **Honest over glossy** – Prefer real photos, real stories, and realistic expectations over styled perfection.
- **Clarity over cleverness** – Make it easy to answer "what is this, where is it, what do I do next?".
- **Place-first** – Root content in the specific land, climate, and people of Carinya Parc.
- **Low-friction reading** – Prioritise fast, readable pages (especially for mobile visitors with average regional connectivity).
- **Expandable, not bloated** – Start simple, but design information architecture so new offerings can slot in cleanly.

## Target Users & Personas

### Primary personas

- **Urban weekender (Sydney / regional cities)**
  - Age 28–55, often couples or small families.
  - Seeking a restorative rural escape with meaningful connection to land and food.
  - Values authenticity, comfort, and clear practical information (travel, amenities, what to expect).

- **Regenerative agriculture learner**
  - Early-stage farmers, gardeners, designers, or students of permaculture / regen ag.
  - Looking for real-world examples, before/after stories, and practical experiments.
  - Values educational content, transparency about failures, and repeatable patterns.

- **Food-motivated guest**
  - Deep interest in cooking, provenance of ingredients, and seasonal eating.
  - Drawn to recipes, paddock-to-plate stories, and the connection between soil and food.

- **Future collaborator / partner**
  - Chefs, educators, local businesses, and organisations aligned with regenerative values.
  - Interested in potential events, retreats, or content collaborations.
  - Needs a clear sense of brand values, professionalism, and point-of-contact.

### Secondary personas

- **Local community**
  - Neighbours, local councils, and regional organisations.
  - Want to understand what Carinya Parc is doing on the land and why.

- **Prospective land stewards**
  - People considering similar projects who are researching examples.
  - Looking for patterns and pitfalls, not a polished marketing case study.

## Problems & Needs

From a user perspective, the website should address:

- **Lack of trustworthy, detailed information** about what staying on a working regenerative farm is actually like.
- **Decision friction** when comparing rural stays: comfort level, activities, access, and expectations are often vague.
- **Limited understanding of regenerative agriculture** and how it translates into concrete practices on a specific property.
- **Difficulty discovering deep-dive stories** (e.g., soil, tree systems, failures) that are scattered across social media or offline.
- **No clear channel to stay connected** (newsletter, updates, recipes) once someone discovers the property.

From a Carinya Parc perspective, the website should address:

- **Reliable, ownable digital presence** that is not dependent on third-party booking or social platforms.
- **A way to pre-qualify guests**, so people who book understand the nature of the stay (working farm, seasonal variation, weather realities).
- **A channel to build a long-term audience**, especially via email subscriptions.
- **A foundation for future revenue streams**, such as workshops, events, and products.

## Value Proposition

Carinya Parc offers:

- **A grounded, regenerative farm stay in NSW** where guests experience real land stewardship, not a staged rural backdrop.
- **Deep storytelling about the land**, including long-form reflections on successes, failures, and the messy work of restoring ~42 ha of property.
- **Food-focused experiences**, linking soil health to what ends up on the plate through recipes and seasonal content.
- **A learning environment**, where visitors and readers can see regenerative principles applied in context rather than in theory.

The website brings this value to life by:

- Clearly explaining the **place, people, and practices** behind Carinya Parc.
- Offering **narrative blog posts** on regeneration work and decision-making.
- Sharing **kitchen-focused recipes** grounded in what is grown or raised on the property.
- Providing **practical information** about visiting, seasons, and the realities of farm life.

## Key Product Pillars & Features

### Pillars

- **Stay**: A calm, comfortable, and honest depiction of the guest experience on a working farm.
- **Regenerate**: Transparent storytelling about landscape restoration, soil, water, trees, and animals.
- **Food**: Recipes and stories that demonstrate the value of good ingredients and seasonal cooking.
- **Learn**: Insights that help others understand and, where appropriate, apply regenerative ideas.

### Current feature set (website)

- **Home page**
  - High-level overview of Carinya Parc, key pillars, and featured content.
  - Strong visual sense of place through photography.

- **About section**
  - Story of the owners, the property history, and the shift toward regeneration.
  - Deeper sub-pages (e.g., "the property", personal story pages).

- **Regenerate page**
  - Curated overview of the regenerative project.
  - Links to deeper blog posts on major themes (e.g., soil, trees, failures).

- **Blog**
  - Long-form narrative posts (e.g., restoring 42 ha of land, lessons from failure).
  - Written as MDX under `content/posts/` and published by merging a pull request.

- **Recipes**
  - Farm-inspired recipes (e.g., herbed omelette with native greens, slow-roasted Dexter beef).
  - Structured recipe data in MDX frontmatter (`content/recipes/`) with ingredients, instructions, and timing.

- **Legal and trust**
  - Privacy policy and terms of service pages surfaced clearly (MDX in git).
  - Signals around data handling and cookies.

- **Subscribe / newsletter**
  - Simple email subscription form.
  - Positioning of the newsletter as the primary ongoing relationship channel.

- **Contact**
  - Contact form for enquiries and collaborations.
  - Validated and sanitised server-side.

### Near-future feature ideas (staged rollout)

- **Stay information**
  - Clear description of accommodation, seasonality, what to expect, and how to enquire.
  - Honest "what it's not" section to avoid misaligned expectations.

- **Experiences and workshops**
  - Light scaffolding for future on-farm experiences, classes, or retreats (e.g. `/experiences`).
  - Ability to highlight seasonal or one-off events.

- **Partner / collaborator page**
  - Information for chefs, educators, and organisations interested in working with Carinya Parc.
  - Clear contact pathways and expectations.

## Non-goals & Out of Scope

The website is **not** intended to:

- Operate a full-featured booking engine (real-time availability, payment capture) in the first iteration.
- Become a generic blog platform detached from the specific place and people.
- Support multi-property or multi-brand functionality.
- Serve as an e-commerce store for products at launch (e.g., no complex cart/checkout flows).
- Provide in-depth agronomic advice or consulting services beyond storytelling and high-level explanation.

If and when these areas become relevant, they should be treated as distinct product extensions with their own specs, not implicit scope creep.

## Tone & Voice

- **Plain, conversational, confident** – avoid jargon-heavy "eco" language unless it's explained.
- **Transparent** – include failures, experiments, and trade-offs, not just highlight reels.
- **Generous** – share enough detail that others can learn, without pretending to be an authority on all things.

Any new content should be checked against these tone expectations.

## Business Objectives & Success Metrics

### Business objectives (website-specific)

- **Direct relationship-building**
  - Grow a high-quality subscriber base via the newsletter.

- **Guest pipeline**
  - Pre-qualify and inform potential guests to reduce misaligned expectations and avoid unnecessary back-and-forth.

- **Brand-building**
  - Establish Carinya Parc as a respected example of regenerative land stewardship and hospitality in NSW.

- **Future offer readiness**
  - Build an audience and narrative foundation for future workshops, events, and products.

### Example success metrics

- **Engagement**
  - Newsletter sign-ups per month.
  - Percentage of visitors who read at least one full blog post or recipe.
  - Scroll depth and time-on-page for key narrative posts.

- **Acquisition**
  - Contact and subscribe form submissions.
  - Proportion of guests who discovered Carinya Parc through the website.

- **Content performance**
  - Time on page and scroll depth for cornerstone stories (regeneration posts, property stories).
  - Repeat visits within 90 days (newsletter or organic).

These metrics should be reviewed regularly and adjusted as new offerings (e.g., workshops) go live.

## Assumptions & Constraints

### Assumptions

- Carinya Parc is a single-property project in NSW with ~42 hectares under management.
- Initial guest bookings are handled through **simple enquiry flows** (email or form), not full online booking.
- The website is the **source of truth for content**, with social media treated as a distribution layer, not the primary home.
- All written content uses **Australian English** spelling and style.
- Photographic assets are available and representative of real conditions (no stock-only photography).

### Constraints

- **Time & capacity**: Owners have limited time to produce content; publishing a post or recipe should be a matter of writing an MDX file and merging it, with agents able to draft in the same format.
- **Connectivity**: Some guests may browse on mobile with average regional connectivity; pages must be lean and performant.
- **Honest representation**: Marketing language must align with on-the-ground reality (seasonality, weather, work-in-progress areas).
- **Regenerative values**: Decisions about features and content should reinforce transparency, care for land, and realistic expectations, not over-promising.

Where these assumptions change (e.g., full booking engine or online courses), update this document and the affected features list.
