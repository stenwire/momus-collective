# momus collective — Design System (Master)

Source of truth for every storefront screen in M6. A page file in `pages/`
overrides this one for that page only. Decisions: D-106 (style), D-107
(motion), D-108 (haptics), D-110 (images). The PRD wins any conflict.

## Direction

**Kinetic Neoclassical Brutalism.** Classical authority, mocked.

- **Brutalist structure.** 0 radius, 1px hairline rules, a visible column grid, and a `№` index on every product.
- **Kinetic type.** The slogan is the product, so slogans move, get struck through and get stamped.
- **Neoclassical material.** Bone, laurel gold and marble grain on ink, taken from the raven, the toga and the wordmark.
- **Brutal motion, not soft.** Motion snaps, stamps and collapses hard offsets; it does not float or blur.

The storefront is dark only.

## Colour

| Token | Value | Use | Contrast on ink (measured) |
|---|---|---|---|
| `ink` | `#0A0A0A` | page background | — |
| `ink-raised` | `#151413` | cards, sheets, inputs | — |
| `bone` | `#EFEAE2` | primary text, the wordmark colour | 16.5:1 |
| `bone-muted` | `#A8A29A` | secondary text | 7.8:1 |
| `rule` | `bone` at 16% | hairlines, borders | decorative |
| `laurel` | `#C9A24A` | the one accent: primary CTA, focus ring, price, active state | 8.3:1 (ink on laurel 8.3:1) |
| `violet` | `#2A1F3D` | raven sheen; rare hover glow, never behind text | decorative |
| `error` | `#E5484D` | errors | 5.1:1 (4.7:1 on ink-raised) |
| `ok` | `#4CC38A` | success | 8.9:1 |

**Rules:**
- Text on `laurel` is `ink`.
- Never put text on `violet`.
- Components use these tokens only. No raw hex, and no `zinc-*` or `amber-*` utilities.
- Marble grain is an inline SVG `feTurbulence` at about 4% opacity, used on the hero, Our Story and placeholders.

## Type

| Role | Font | Treatment |
|---|---|---|
| Display, slogans | Anton | uppercase, tight tracking, `clamp(3rem, 12vw, 9rem)` for heroes |
| UI, body | Epilogue 400–700 | 16px base, 1.5 line height |
| Meta: `№`, prices, statuses, counts | Space Mono | `tabular-nums` |

**Notes:**
- Headings use `text-wrap: balance`.
- Anton and Space Mono are already loaded for the design tool. The nine shirt-text fonts are fixed (D-066) and are not UI fonts, apart from these two.

## Shape and devices

**Shape:**
- **Radius:** 0 everywhere. Pills keep `9999px`.
- **Borders:** 1px `rule`.
- **Press affordance:** a hard 4px `laurel` offset shadow. On press, the element moves 2px and the shadow collapses to 0.

**Devices:**
- **`№014` index:** shown on each product card.
- **Slogan marquee:** must have a pause control.
- **Strike-through and redaction bar:** drawn from the tagline "dressed up, filtered out."
- **Exposed column grid:** used on the home page.

**Touch:** targets are at least 44x44px, and every page works at 360px.

## Motion

Use the `motion` library through `LazyMotion` and `m.*` components, under `MotionConfig reducedMotion="user"`. Use CSS for hovers and the marquee.

| Token | Value |
|---|---|
| `micro` | 120ms |
| `short` | 200ms |
| `medium` | 320ms |
| `long` | 560ms |
| exit | about 70% of the enter time |
| `snap` spring | stiffness 700, damping 40 (toggles, selection) |
| `press` spring | stiffness 500, damping 30 (buttons) |
| `settle` spring | stiffness 260, damping 26 (sheets, layout) |

**Rules:**
- Animate transform and opacity only.
- Never use `transition-all`.
- Every animation must be interruptible.
- Reveal content on view once, with no replay.
- Under reduced motion, transforms are removed and opacity cross-fades stay.
- Split text by character only for headlines under about 8 words, and keep the full string as the accessible name.

## Measured contrast (M6 DoD 2)

Every text/background pair the storefront uses, measured with the WCAG 2.1
relative-luminance formula (T-613). Tints are composited over `ink`.
`src/app/theme.test.ts` re-checks the solid pairs on every test run.

| Text | Background | Where | Ratio | |
|---|---|---|---|---|
| `bone` | `ink` | body text, headings | 16.53:1 | AA |
| `bone` | `ink-raised` | cards, sheets | 15.37:1 | AA |
| `bone-muted` | `ink` | secondary text | 7.82:1 | AA |
| `bone-muted` | `ink-raised` | secondary text on cards | 7.27:1 | AA |
| `laurel` | `ink` | prices, kickers, links | 8.25:1 | AA |
| `laurel` | `ink-raised` | prices on cards | 7.67:1 | AA |
| `ink` | `laurel` | primary button label | 8.25:1 | AA |
| `ink` | `laurel-hi` | primary button hover | 10.53:1 | AA |
| `ink` | `bone` | bone Tag | 16.53:1 | AA |
| `error` | `ink` | error text | 5.06:1 | AA |
| `error` | `ink-raised` | error text in sheets | 4.70:1 | AA |
| `ok` | `ink` | success text | 8.94:1 | AA |
| `ok` | `ink-raised` | success in sheets | 8.31:1 | AA |
| `bone` | `laurel/10 on ink` | cart notice text | 14.63:1 | AA |
| `error` | `error/10 on ink` | danger button hover | 4.69:1 | AA |
| `laurel` | `laurel/10 on ink` | Undo on hover tint | 7.30:1 | AA |

## Haptics

`useHaptics()` from `lib/haptics.ts`.

| Pattern | Vibrate (ms) | Fires on |
|---|---|---|
| `tick` | 8 | wishlist toggle, size and colour selection, sheet drag-dismiss threshold |
| `success` | 12, 40, 18 | add to bag, payment confirmed |
| `warning` | 30, 60, 30 | quantity limit reached |
| `error` | 40, 30, 40, 30, 40 | form submitted with errors |

**Rules:**
- Use Android `navigator.vibrate`.
- On iOS 18+, use a hidden switch-checkbox tick, which is always a single tick.
- Fire only on real user activation.
- Never fire on general taps.
- The footer toggle switches haptics off.

## Images

Every image slot has a fixed aspect ratio and alt text. Until a final asset exists, it shows a placeholder: an ink block with marble grain, a hairline border, and a Space Mono caption such as `[ RAVEN · 3:4 ]`. Final images are WebP/AVIF under 150 KB.

## Accessibility and Web Interface Guidelines

**Focus and keyboard:**
- Show a `:focus-visible` laurel ring, 2px with an offset.
- Set `scroll-margin-top` so the sticky nav never hides focus.
- Every gesture also works by tap and by keyboard.

**Touch and overlays:**
- Use `touch-action: manipulation` and a deliberate tap-highlight colour.
- Sheets contain overscroll.

**Forms:**
- Errors appear inline, and focus moves to the first error on submit.
- Placeholders end with "…".

**Content:**
- Prices and counts are announced via `aria-live`.
- Flex children get `min-w-0`, and long slogans clamp.
- Every list has an empty state.

## Avoid

- Pop colours such as Neubrutalism's mustard and coral.
- Gradients other than the marble grain.
- Rounded cards.
- Glass blur on scrolling content.
- Emoji as icons; use `lucide-react` instead.
- Spinners that flash on fast responses; use skeletons.
- Haptics on every tap.
