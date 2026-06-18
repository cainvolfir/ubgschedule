# Design — UBG Schedule

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre

**playful** — pixel art mascot, gamified wizard steps, friendly tone. The
personality lives in the mascot illustrations and the step-by-step flow, not in
glow effects or gradient buttons.

## Aesthetic direction — terminal-friendly

The app leans into a **terminal / CLI aesthetic** — dark surfaces, monospace
accents, scanline textures, typing animations, and a "command line" feel — but
keeps it approachable and friendly through:

- **Mascot presence:** The UGO pixel art mascot appears on every page — in the
  navbar, on the step indicator, in empty/loading states, and as a friendly
  greeter. The mascot is the "face" of the terminal.
- **Typing messages:** The mascot delivers contextual messages via a typing
  animation (character-by-character reveal with a blinking cursor). Messages
  change based on the current step and state.
- **Pixel art animals:** Small pixel art animal decorations (birds, cats,
  etc.) appear as subtle background elements or section dividers — never
  obstructive, always decorative.
- **Terminal chrome:** Drop zones and code-like elements use a terminal frame
  style — a subtle header bar with colored dots (● ● ●), monospace labels, and
  a `>` prompt prefix on action areas.
- **Scanline texture:** A very subtle CSS scanline overlay (1px lines at 50%
  opacity, 2px spacing) on the background gives a CRT/terminal feel without
  hurting readability.
- **Monospace for data:** Course codes, time values, room numbers, and table
  headers use the mono font. Body text stays in Inter.
- **Green phosphor accent:** A secondary accent color — phosphor green
  `oklch(75% 0.18 145)` — is used sparingly for terminal-style highlights:
  the active typing cursor, prompt markers, and success states.

## Macrostructure family

This is a wizard-style app with three pages. All pages share a single
macrostructure family:

- **App pages (all):** Workbench — a focused, single-column workspace with a
  sticky top bar (nav + step indicator), a main content area, and a minimal
  footer. The content is the interface; chrome stays out of the way.

## Theme

The palette is anchored on the existing UBG brand blue and teal, converted to
OKLCH for consistency. Dark mode is the default (the app ships with a dark
"midnight study" feel).

```
--color-paper:       oklch(12% 0.02 250)   /* dark surface */
--color-paper-2:     oklch(18% 0.02 250)   /* card surface */
--color-paper-3:     oklch(24% 0.02 250)   /* elevated surface */
--color-ink:         oklch(92% 0.01 250)   /* primary text */
--color-ink-2:       oklch(72% 0.02 250)   /* secondary text */
--color-rule:        oklch(28% 0.02 250)   /* borders */
--color-accent:      oklch(62% 0.18 250)   /* brand blue */
--color-accent-ink:  oklch(95% 0.01 250)   /* text on accent fill */
--color-accent-2:    oklch(55% 0.12 180)   /* brand teal (secondary) */
--color-accent-2-ink: oklch(95% 0.01 180)  /* text on teal fill */
--color-success:     oklch(70% 0.15 145)   /* green */
--color-warning:     oklch(78% 0.15 80)    /* amber */
--color-danger:      oklch(65% 0.18 25)    /* red */
--color-focus:       oklch(70% 0.18 250)   /* focus ring */
```

Light mode inverts paper/ink while keeping accent hues.

## Typography

- **Display (brand):** `"Press Start 2P"`, weight 400, style normal — RESTRICTED
  to: navbar wordmark, step counter, mascot speech bubble. Never for body text,
  form labels, table headers, or section titles. Minimum size: 10px.
- **Body:** `Inter, system-ui, -apple-system, sans-serif`, weight 400/500/600,
  style normal — ALL readable text: headings, body copy, form labels, buttons,
  table cells, toast messages. Minimum size: 12px.
- **Mono:** `ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace` — code
  blocks, time values, room codes only.
- **2+1 discipline:** Press Start 2P (display/brand) + Inter (body) + mono
  (outlier for code). No fourth family.

## Spacing

4-point named scale. Values in `tokens.css`. Pages must use named tokens
(`var(--space-md)`), never raw pixel values.

```
--space-3xs: 0.125rem;  --space-2xs: 0.25rem;  --space-xs: 0.5rem;
--space-sm:  0.75rem;   --space-md:  1rem;      --space-lg: 1.5rem;
--space-xl:  2rem;      --space-2xl: 3rem;      --space-3xl: 4rem;
```

## Motion

- **Stance:** motion-cut by default. The app is a tool, not a showcase.
- **Easings:** `cubic-bezier(0, 0, 0.2, 1)` for `--ease-out`. No overshoot.
- **Reveal pattern:** one fade-in on page mount only. No stagger-children on
  card lists. No scroll-triggered animations.
- **Reduced-motion fallback:** all animations disabled under
  `prefers-reduced-motion: reduce`.
- **Allowed animations:** toast enter/exit, loading spinner, progress bar
  (transform-only), mascot idle breathing (subtle translate, no scale).
- **Banned:** `animate-ping`, `animate-pulse` on UI elements, `hover:scale`
  on more than one element type, `transition-all`, `cubic-bezier(0.16, 1, 0.3, 1)`.

## Microinteractions stance

- **Silent success** over celebratory toasts. Toasts for errors and loading
  states only.
- **Hover:** border-color change or background-color shift. No glow, no scale,
  no shadow-glow.
- **Focus-visible:** 2px solid ring at ≥3:1 contrast. Instant appearance (no
  transition on focus ring).
- **Active:** `translateY(1px)` for press feedback. No scale(0.98).
- **Disabled:** `opacity: 0.5` + `cursor: not-allowed` + native `disabled`.
- **Loading:** `CatState` component with pose animation. No sparkle icons.

## CTA voice

- **Primary CTA:** flat fill (`background: var(--accent)`), no gradient,
  `border-radius: var(--radius-md)`, `padding: 0.625rem 1.25rem`,
  `font-weight: 600`, `font-size: 0.875rem` (Inter, not pixel font).
- **Secondary CTA:** outline style (`border: 1px solid var(--rule)`),
  transparent background, same sizing as primary.
- **Hover:** `background-color` shift (darker for primary, subtle fill for
  secondary). No glow, no scale.
- **Destructive:** flat fill `var(--danger)`, same shape.

## What pages MUST share

- The wordmark / logotype (UBG Schedule in pixel font, navbar only).
- The accent colour and its placement (≤ 5 % per viewport).
- The body font (Inter) for all readable text.
- The CTA voice (button shape, border-radius, padding rhythm).
- The nav structure (mascot + title left, theme switcher right).
- The step indicator pattern (mascot on active step, checkmark on completed).

## What pages MAY differ on

- Hero illustration: Upload pages get the large UGO mascot art; Result page
  has no hero illustration.
- Table vs. grid: Result page has both views; upload pages have card lists.
- Drop zone styling: each upload page has its own accent color (blue for
  theory, teal for practical).

## Anti-patterns — hard bans for this project

1. No `box-shadow` glow effects (`0 0 Npx var(--color-glow)`).
2. No `drop-shadow()` filters on SVGs or images.
3. No `backdrop-blur` on nav, step bar, or footer (only on toasts/modals).
4. No gradient backgrounds on buttons or surfaces.
5. No floating decorative orbs or blobs.
6. No `✨` `🎓` `⭐` `🚀` emoji in UI text.
7. No `Sparkles` icon from Lucide as decoration.
8. No `animate-ping` or `animate-pulse` on step indicators, buttons, or
   section headers.
9. No `stagger-children` on card grids.
10. No `cubic-bezier(0.16, 1, 0.3, 1)` (overshoot easing).
11. No `transition: all` or transitions on more than 2 properties per element.
12. No `hover:scale-105` on more than one element type.
13. No pixel font below 10px or on non-brand text.
14. No decorative corner accents, fake chrome, or ornamental borders.

## Exports

### tokens.css
See `src/tokens.css` (generated alongside `src/index.css`).

### Tailwind v4 `@theme`
Not applicable — project uses Tailwind v3 with `tailwind.config.js`.

### DTCG `tokens.json`
Not generated — project uses CSS custom properties directly.

### shadcn/ui CSS variables
The project's existing `--background`, `--foreground`, `--primary`, etc. in
`src/index.css :root` serve this role. Values updated to match the OKLCH palette
above.
