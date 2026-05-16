# DESIGN.md

## Color system

Strategy: **Committed** for the landing page (one saturated color carries identity), **Restrained** for the dashboard (tinted neutrals + status colors, with the brand violet showing only on focus + emphasis).

All neutrals are tinted toward the brand hue (chroma 0.005–0.01). No flat `#000` or `#fff`.

| Role        | OKLCH                       | Approx hex | Use |
|---|---|---|---|
| ink         | `oklch(0.16 0.012 295)`     | `#0b0d10`  | page background |
| slab        | `oklch(0.20 0.015 295)`     | `#11151b`  | card / panel background |
| edge        | `oklch(0.27 0.018 295)`     | `#1c232c`  | dividers, borders, hairlines |
| zinc-300    | `oklch(0.86 0.012 295)`     | `#d4d4d8`  | primary body text |
| zinc-500    | `oklch(0.65 0.012 295)`     | `#71717a`  | secondary body text |
| rune        | `oklch(0.56 0.225 295)`     | `#7c3aed`  | brand accent — buttons, focus rings |
| bifrost     | `oklch(0.74 0.18 295)`      | `#a78bfa`  | brand emphasis — headings, important inline tokens |
| allow       | `oklch(0.72 0.17 158)`      | `#10b981`  | ALLOW status |
| warn        | `oklch(0.78 0.15 75)`       | `#f59e0b`  | FLAG status |
| deny        | `oklch(0.65 0.20 25)`       | `#ef4444`  | DENY status |

The Tailwind config (`tailwind.config.ts`) already encodes the hex approximations under the same names. New code should use those token names exclusively (`text-bifrost`, `border-edge`, `bg-slab`, `text-allow|warn|deny`). Never reintroduce raw hex except inside the Tailwind config itself.

## Theme

Dark. Concrete scene: *a security operator glancing at the rule sidebar at 11pm in a dim ops room while a chain is mid-evaluation; the dashboard is a watchpost, not a feed*. Light theme is not on the roadmap; Heimdall reads as a watchpost and that is a dark surface.

## Typography

Two families, intentional contrast.

- **Display + headings:** a tight, dense serif or grotesque with strong weight contrast. Acceptable choices: Inter Display, GT Sectra, Söhne, Inter w/ tight tracking. Implementation should ship Inter via `next/font` for both display and body to keep the dependency surface zero-network. Display sets at 700/600 weight, body at 400/500.
- **Mono:** `ui-monospace, SFMono-Regular, Menlo, monospace`. Used heavily — every agent id, every JTI, every scope token. Mono is part of the brand voice.
- **Body:** `font-sans` Inter, 15px base, 1.55 line height.
- **Scale (ratio 1.25):** 12, 13, 15, 19, 24, 30, 38, 48, 60, 76. The display headline sits at 60–76.

Hierarchy rules:

1. Weight contrast is the primary signal (700 vs 400). Never rely on color alone for hierarchy.
2. Body line length ≤ 70ch. Don't let prose stretch the page.
3. Numbers in the stat section render in mono, not sans. The shape of "88%" matters; tabular mono earns it.
4. Mono labels are uppercase tracked (`tracking-wider`) at 11–12px. Sans labels never are.

## Layout & spacing

Spacing rhythm: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Vary deliberately. Same padding on everything is monotony; the landing page's section spacing should pulse, not march.

- **Outer container:** content max-width `1200px`, ample side padding (`px-6` mobile, `px-12` desktop). No edge-to-edge cards.
- **Vertical rhythm:** sections separated by `py-32` on desktop, `py-20` on mobile. Subheaders sit `mt-24` after the previous section's body.
- **Grid:** use 12-col on the landing page sparingly. Most sections are 2-col or full-width prose. The verticals section is a 3-col asymmetric grid.

No nested cards. No drop shadows. Borders only via the `edge` token at 1px. Surfaces differentiate via the `ink → slab → edge` brightness gradient, not via shadow.

## Components (landing)

- **Hairline rule:** 1px `bg-edge` divider used between sections. Sometimes prefixed with a single uppercase tracked label (`§ 02  ARCHITECTURE`) to give the page section-numbering rhythm.
- **Stat block:** a 4-up row of large mono percentages on the problem section. Each stat is `90px / mono / 600` with a one-line caption underneath in zinc-500 at 13px. No card around it. No icons.
- **Architecture diagram:** two stacked rows, "Layer 1 — Protocol" and "Layer 2 — Policy", each with their primitives listed inline as mono tokens with hairline outlines. This is the page's centerpiece; spend craft here.
- **Vertical card** (3-up): no card chrome. Each vertical is a numbered block (`§ 01 / DEFI`) with title, one-line description, a list of 3 specific behaviors, and a small mono tag set showing the rules that fire.
- **CTA buttons:** `rune` background, `bifrost` text. Solid, not gradient. Secondary CTAs are mono uppercase outline buttons (`border-edge text-zinc-300`).

## Components (dashboard)

Existing components in `frontend/components/` are the design reference. Don't redesign them as part of this task; the dashboard's visual language is locked. The landing page must inherit it visually so navigating from `/` to `/dashboard` feels like one product.

## Motion

- All transitions: `ease-out-quart` or `ease-out-expo`. Never bounce, never elastic.
- Hover transitions on buttons: 120ms.
- Section reveals on scroll: 480ms `ease-out-expo`, opacity + 12px translateY only. Never animate layout properties.
- Inline mono tokens in the architecture diagram: tiny `pulse_soft` on the live items (mirrors the dashboard's "active hop" state).

## Iconography

Almost none. The product story is carried by typography and structure. When an icon is truly needed (CTA arrows, external link), use a 1px stroke geometric inline SVG, currentColor — no icon library, no rounded-corner emoji-style icons.

## Don'ts (project-specific)

- No big-number-with-tiny-label hero metrics (the SaaS cliché).
- No identical card grids.
- No gradient orbs, no glow halos, no glassmorphism.
- No "AI generated abstract shapes" hero backgrounds.
- No stock photography of any kind.
- No "trust badge soup" (compliance logos as wallpaper).
- No `≥1px` colored side-stripe borders (the impeccable absolute ban).
- No em dashes. Use commas, colons, semicolons, periods.
- No `text-transform: uppercase` on body prose. Uppercase is reserved for tracked mono labels.

## Inheritance

Anything not covered here defaults to the impeccable shared design laws (OKLCH neutrals, 1.25 scale, no `#000`/`#fff`, ease-out-expo motion, no side-stripe borders, no gradient text, etc.).
