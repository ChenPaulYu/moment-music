# Design Guide

Visual design system for Moment Music. Dark-mode-first, glass morphism aesthetic.

**Tailwind CSS:** v3.4 (not v4). Custom glass classes defined in `frontend/src/index.css`.

---

## Color Palette

### Core Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#3713ec` | CTAs, active states, accent highlights |
| `primary-hover` | `#3713ec` at 90% opacity | Button hover states |
| `bg-dark` | `#131022` | Page background |
| `surface` | `#1e1933` | Card backgrounds, panels |
| `surface-glass` | `rgba(255,255,255,0.05)` | Glass morphism panels |
| `border` | `rgba(255,255,255,0.1)` / `#292348` | Subtle borders |
| `text-primary` | `#ffffff` | Main text |
| `text-secondary` | `#9b92c9` | Secondary text, descriptions |
| `text-muted` | `rgba(255,255,255,0.4)` | Labels, captions |
| `success` | emerald/green | System online, API key configured |
| `warning` | amber | Caution states |
| `error` | red | Error states, API key missing |

### Mode Accent Colors
| Mode | Color | Tailwind Class |
|------|-------|---------------|
| Write | Pink | `text-pink-400` |
| Listen | Blue | `text-blue-400` |
| Move | Green | `text-emerald-400` |
| Be | Amber | `text-amber-400` |

### Accent Colors
- Purple: `#6d28d9` — secondary accent
- Gradient overlays: multi-color blends for animated backgrounds

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

The signature visual effect. Defined as reusable CSS classes in `index.css`:

| Class | Usage |
|-------|-------|
| `.glass-panel` | Cards, panels, containers |
| `.glass-input` | Text inputs, textareas |
| `.glass-button` | Secondary action buttons |

```css
/* .glass-panel */
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

**Segmented Control (OutputTypeSelector):**
- Pill-shaped radio group with icons
- Active segment: primary background with glow
- Inactive: glass background
- Three options: Instrumental (piano), Song (lyrics), Narration (record_voice_over)

**Pill Selector (Setup page):**
- Small pill buttons for engine selection
- Active: `bg-primary/20 text-white border-primary/40`
- Inactive: `bg-[#131022] text-[#9b92c9] border-[#292348]`

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

**Icon Set:** Material Symbols Outlined (Google Fonts CDN)
- Wrapped in `MaterialIcon` component for consistent usage
- Fill variations: 0 (outlined) or 1 (filled) for active states
- Sizes: 20px (small), 24px (default), 32px (large), 48px (feature)

Common icons:
- `edit` — Write mode
- `mic` — Listen mode
- `directions_run` — Move mode
- `nature` — Be mode
- `piano` — Instrumental output
- `lyrics` — Song output
- `record_voice_over` — Narration output
- `play_arrow`, `pause` — Player controls
- `download`, `bookmark` — Save/archive actions
- `key` — API keys
- `image` — Album art

---

## Key UI Components

| Component | Location | Usage |
|-----------|----------|-------|
| `PageLayout` | `components/layout/` | Wraps all pages with AnimatedBackground + Header + Footer |
| `AnimatedBackground` | `components/layout/` | Floating gradient blobs behind content |
| `OutputTypeSelector` | `components/ui/` | Shared 3-option pill selector across all modes |
| `GenerateButton` | `components/ui/` | Shared generate CTA with loading state |
| `GenerationSteps` | `components/ui/` | Step progress display during generation |
| `MaterialIcon` | `components/ui/` | Wrapper for Google Material Symbols |
| `ModeCard` | `components/ui/` | Mode selection card on Entryway |
| `SoundscapeCard` | `components/ui/` | Library item card with album art |
| `AudioVisualizer` | `components/ui/` | Animated bars for audio playback |
| `AnimateIn` | `components/animation/` | Fade-in animation wrapper with stagger delay |
