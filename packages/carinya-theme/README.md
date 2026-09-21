# `@carinya/theme`

CSS-first Tailwind CSS 4 theme for Carinya Parc. Production token source of truth.

```css
@import '@carinya/theme';
```

Site-specific CSS (`@plugin` typography, component utilities, page overrides) stays in `apps/web`. Fonts load from `@fontsource-variable/hanken-grotesk` and `@fontsource/marcellus` in `apps/web/src/styles/globals.css`; this package does not `@import` Google Fonts.

## What this package owns

All brand tokens live in `css/tokens.css` as a single `@theme` block (plus `.dark` semantic overrides). Tailwind v4 prefixes colour tokens as `--color-*`.

| Token family                                                   | In `@theme`       | Notes                                                                      |
| -------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| Colour ramps (eucalypt, kangaroo, bracken, branch, wattle)     | Yes               | Full 50–900 ramps; hero is `eucalypt-600`                                  |
| Warm neutrals (bark, charcoal, stone, line, paperbark, fleece) | Yes               |                                                                            |
| Semantic colours (background, primary, muted, ring, charts, …) | Yes               | Also inverse, footer, highlight, popover                                   |
| Radius (`sm`–`xl`, `pill`, default `1rem`)                     | Yes               |                                                                            |
| Warm shadows (`sm` / `md` / `lg`)                              | Yes               |                                                                            |
| Type scale (`text-display` … `text-eyebrow`)                   | Yes               | Utilities: `text-h1`, `text-body`, `tracking-eyebrow`, `tracking-wordmark` |
| Spacing                                                        | Tailwind defaults | 4px grid: spacing `1` = 4px … `20` = 80px                                  |
| Border width                                                   | Tailwind default  | 1px                                                                        |

Do not copy tokens into `apps/web`. Do not keep a parallel vanilla `:root` sheet.

## Type utilities

| Class                                                  | Size              | Default line-height / extras                        |
| ------------------------------------------------------ | ----------------- | --------------------------------------------------- |
| `text-display`                                         | 64px              | 1.05                                                |
| `text-h1`                                              | 48px              | 1.15                                                |
| `text-h2`                                              | 34px              | 1.15                                                |
| `text-h3`                                              | 24px              | 1.15                                                |
| `text-body-lg`                                         | 19px              | 1.6                                                 |
| `text-body`                                            | 17px              | 1.6                                                 |
| `text-small`                                           | 14px              |                                                     |
| `text-eyebrow`                                         | 13px              | tracking 0.24em, weight 600 — still add `uppercase` |
| `tracking-eyebrow`                                     | 0.24em            |                                                     |
| `tracking-wordmark`                                    | 0.3em             |                                                     |
| `leading-display` / `leading-heading` / `leading-body` | 1.05 / 1.15 / 1.6 |                                                     |
