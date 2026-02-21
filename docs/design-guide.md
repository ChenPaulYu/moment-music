# Design Guide

Visual design system for Moment Music, derived from the UI reference screens.

---

## Color Palette

### Core Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#3713ec` | CTAs, active states, accent highlights |
| `primary-hover` | `#3713ec` at 90% opacity | Button hover states |
| `bg-dark` | `#131022` | Page background (dark mode) |
| `bg-light` | `#f6f6f8` | Page background (light mode) |
| `surface` | `#1e1933` | Card backgrounds, panels |
| `surface-glass` | `rgba(255,255,255,0.05)` | Glass morphism panels |
| `border` | `rgba(255,255,255,0.1)` | Subtle borders on dark |
| `text-primary` | `#ffffff` | Main text (dark mode) |
| `text-secondary` | `rgba(255,255,255,0.6)` | Secondary text |
| `text-muted` | `rgba(255,255,255,0.4)` | Labels, captions |
| `success` | emerald/green | System online, connected status |
| `warning` | amber | Caution states |
| `error` | red | Error states, disconnected |

### Accent Colors
- Purple: `#6d28d9` — secondary accent
- Gradient overlays: multi-color blends for backgrounds

---

## Typography

### Font Families
- **Display / Headings:** Space Grotesk (weights: 300, 400, 500, 600, 700)
- **Body text:** System sans-serif stack or Noto Sans
- **Alternative display:** Be Vietnam Pro, Playfair Display (serif, for library/archive)

### Scale
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display XL | text-7xl | 700 | Hero titles |
| Display | text-5xl | 700 | Page titles |
| Heading | text-2xl–3xl | 600 | Section headings |
| Subheading | text-lg–xl | 500 | Card titles |
| Body | text-base | 400 | Paragraphs |
| Small | text-sm | 400 | Descriptions |
| Caption | text-xs | 400–500 | Labels, metadata, uppercase tracking-wider |

---

## Glass Morphism

The signature visual effect. Apply to panels, cards, and overlays.

```css
/* Glass panel */
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 16px;
```

Variations:
- Light glass: `bg-white/5` with `backdrop-blur-md`
- Medium glass: `bg-white/10` with `backdrop-blur-lg`
- Strong glass: `bg-white/15` with `backdrop-blur-xl`

---

## Components

### Buttons

**Primary CTA:**
- Background: `bg-primary`, text white
- Hover: slight opacity reduction, glow shadow
- Size: py-3 px-8, rounded-xl, font-semibold

**Glass Button:**
- Background: `bg-white/5`, border `border-white/10`
- Hover: `bg-white/10`
- Used for secondary actions

**Icon Button:**
- Round, `bg-white/5`
- Hover: scale + color shift
- Used in player controls, toggles

### Cards

**Mode Card (Entryway):**
- Glass panel with icon, title, description
- Hover: lift effect (translate-y, shadow increase), gradient overlay reveal
- Aspect: flexible, with internal padding

**Media Card:**
- Aspect-square, background image fill
- Overlay with play button on hover
- Rounded corners (rounded-2xl)

### Form Controls

**Text Input / Textarea:**
- Glass background with subtle border
- Focus: primary glow ring
- Placeholder: text-muted color

**Segmented Control (Output Type Selector):**
- Pill-shaped radio group
- Active segment: primary background
- Inactive: glass background

---

## Animations

### Keyframe Definitions

| Name | Effect | Duration | Usage |
|------|--------|----------|-------|
| `blob` | Floating circular morphing | 10s | Background ambient blobs |
| `float` | Vertical floating motion | 6s | Floating elements |
| `pulse-slow` | Subtle opacity/scale breathing | 3s | Ambient indicators |
| `pulse-glow` | Glowing shadow pulse | 2s | Active recording state |
| `wave` | Bar height variation | 1.2s | Audio visualizer bars |
| `ping-slow` | Expanding ring effect | 3s | Status indicators |

### Visualizer Bars
- 5+ bars with staggered animation delays
- Height oscillates via `wave` keyframe
- Used in: Listen mode (recording), Moment Player (playback)

### Background Gradients
- Large blurred circles (`blur-3xl`) with primary/purple/blue colors
- `mix-blend-multiply` or `mix-blend-screen`
- Slow position drift via `blob` animation
- Subtle noise/grain overlay on top

---

## Layout Patterns

### Full-Screen Centered
Used for: Entryway, creation modes
- Content centered both vertically and horizontally
- Max-width container (varies by screen)
- Generous padding

### Sticky Header
- Logo + nav links + status indicator + avatar
- `sticky top-0` with glass background
- z-index above content

### Responsive Breakpoints
- Mobile-first (default)
- `md:` — tablet+ (show nav, expand grids)
- `lg:` — desktop (wider containers)

---

## Iconography

**Icon Set:** Material Symbols Outlined (Google)
- Loaded via CDN
- Fill variations: 0 (outlined) or 1 (filled) for active states
- Sizes: 20px (small), 24px (default), 32px (large), 48px (feature)

Common icons:
- `edit` — Write mode
- `mic` — Listen mode
- `directions_run` — Move mode
- `nature` — Be mode
- `play_arrow`, `pause`, `skip_next`, `skip_previous` — Player controls
- `download`, `bookmark` — Save/archive actions
