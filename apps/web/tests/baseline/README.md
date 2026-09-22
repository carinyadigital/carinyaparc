# Production baseline — captured 21 September 2026

Source of truth for the `test:parity` suite. Captured by hand in a browser because the
production firewall answers every scripted request with 429.

## Files

| File            | Contents                                                                |
| --------------- | ----------------------------------------------------------------------- |
| `sitemap.xml`   | Production `/sitemap.xml` as served on 21 Sep 2026 (80 URLs)            |
| `urls.json`     | The 80 sitemap paths plus the non-sitemap routes that must keep working |
| `metadata.json` | Observed `<head>` and JSON-LD facts for eight representative URLs       |
| `README.md`     | This file — how the baseline was captured and what it revealed          |

## What the live site does today (observed in a real browser)

| Path                                                      | Status | Title                                                                                   | JSON-LD types                                                 | Notes                                             |
| --------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| `/`                                                       | 200    | `Carinya Parc`                                                                          | Organization, BreadcrumbList, LocalBusiness (+ nested)        | og:type website; og:image `/images/hero-home.jpg` |
| `/blog/`                                                  | 200    | `Blog \| Carinya Parc`                                                                  | Organization, BreadcrumbList                                  | h1 "Field notes from a farm coming back to life"  |
| `/blog/masterchef-to-mud-boots/`                          | 200    | `From MasterChef to Mud Boots - Blog - Carinya Parc \| Carinya Parc`                    | Organization, BreadcrumbList, Article (Person, WebPage, Blog) | og:type article; site suffix appears twice        |
| `/recipes/slow-roasted-dexter-beef-with-root-vegetables/` | 200    | `Slow-Roasted Dexter Beef with Root Vegetables - Recipe - Carinya Parc \| Carinya Parc` | Organization, BreadcrumbList, Recipe (Person)                 | no og:image; Recipe has no `recipeInstructions`   |
| `/get-involved/events/`                                   | 200    | `Events - Get Involved \| Carinya Parc`                                                 | Organization, BreadcrumbList                                  | no events published; page shows the empty state   |
| `/blog/category/produce/`                                 | 200    | `Produce - Blog \| Carinya Parc`                                                        | Organization, BreadcrumbList                                  | empty archive (no posts in category)              |
| `/blog/tag/beef/`                                         | 200    | `beef - Blog \| Carinya Parc`                                                           | Organization, BreadcrumbList                                  | empty archive (tag only used by a recipe)         |
| `/legal/privacy-policy/`, `/legal/terms-of-service/`      | 404    | —                                                                                       | —                                                             | **listed in sitemap but broken in production**    |
| `/blog/page/2/`                                           | 404    | —                                                                                       | —                                                             | ten posts at six per page, yet no page 2          |
| `/feed.xml`                                               | 200    | `Carinya Parc Blog`                                                                     | —                                                             | RSS                                               |
| `/robots.txt`                                             | 200    | —                                                                                       | —                                                             |                                                   |
| `/no-such-page/`                                          | 404    | `Carinya Parc`                                                                          | —                                                             | custom 404 page                                   |

Common `<head>` on every page: `theme-color #5F8575`; `robots index, follow`;
`googlebot index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1`;
`og:site_name Carinya Parc`; `og:locale en_AU`;
`twitter:card summary_large_image`; `twitter:site` / `twitter:creator` `@carinyaparc`;
`keywords` meta populated from a per-page list.

Article JSON-LD carries: headline, description, author (Person), publisher (Organization),
datePublished, dateModified, mainEntityOfPage, url, image, articleSection "Blog",
wordCount, keywords (tag names, comma-separated), about, isPartOf (Blog).

Recipe JSON-LD carries: name, description, author, prepTime, cookTime, totalTime,
recipeYield, recipeIngredient, datePublished — and nothing else.

## Findings that change the target, not just the test

1. **Legal pages are broken in production.** Both `/legal/*` URLs are in the sitemap and
   return 404. The Astro `legal` collection fixes this; the parity test must expect 200,
   not match production.
2. **Doubled site suffix on detail pages.** Post and recipe titles end in
   `- Carinya Parc | Carinya Parc`. The Astro metadata helper should emit the suffix
   once; allow-list this difference.
3. **Empty archives are indexable.** Four of five category pages and roughly half the 52
   tag pages render an empty list with `robots: index, follow`. The Astro build generates
   archive pages only for taxonomies with at least one published entry; the missing URLs
   are intentional and go on the allow-list. Recipe-only tags get `/recipes/tag/` pages
   only if we decide to surface recipe tags at all.
4. **Pagination is absent.** `/blog/page/2/` is 404 with ten published posts. Astro's
   `paginate()` will produce it; treat as a fix.
5. **Recipe structured data is thin.** No `recipeInstructions`, `recipeCategory`,
   `image`, or `og:image` on recipes. Frontmatter has the data; the Astro Recipe JSON-LD
   should include instructions and image when present.
6. **`og:image` falls back to the home hero everywhere** (including blog index and events).
   Keep the same fallback so social previews don't regress. Width and height are no longer
   one pair on every page: pages with no hero stamp the default file's real size
   (1920×1280), and a post or recipe with a photograph stamps a 1200×630 centre crop.
   Those dimensions are asserted separately, not in the common head.

## Parity test contract

- Every path in `urls.json` returns 200 from `dist/`, except paths listed under
  `intentionallyRemoved` in that file (empty archives) — those must 404 and be absent
  from the generated sitemap.
- For each of the eight representative URLs in `metadata.json`: `description`,
  `canonical`, `og:type`, `robots`, and the set of top-level JSON-LD `@type`s match, and
  `title` matches after normalising the doubled suffix.
- Every page emits the common `<head>` set above, except `404.html` which is
  `noindex, follow` and omits a canonical so unknown URLs are not indexed as the
  error template.
- `/legal/*` and `/blog/page/2/` return 200 (documented fixes).
