# London Day Planner — Design System

> The visual language for Plan Your Perfect Day — an AI-powered travel companion trusted by explorers worldwide.

---

## Brand Identity

### Mission
Help travelers craft unforgettable days in the world's greatest cities through AI-powered itinerary generation with a premium, editorial feel.

### Personality
- **Confident** — bold serif typography, decisive color choices
- **Inviting** — warm pink accents, frosted glass surfaces
- **Premium** — careful spacing, refined micro-interactions
- **Playful** — gradient overlays, smooth carousel animations

---

## Color Palette

### Primary Colors

| Token | Hex | Usage |
|---|---|---|
| `--brand-blue` | `#17B9E6` | Primary actions, links, active states, borders |
| `--brand-pink` | `#FC94C5` | Secondary actions, accents, highlights |
| `--brand-black` | `#1C1C1C` | Headings, primary text, high-contrast elements |

### Neutral Scale

| Token | Value | Usage |
|---|---|---|
| `--white-95` | `rgba(255,255,255,0.95)` | Card backgrounds, panels |
| `--white-85` | `rgba(255,255,255,0.85)` | Glass surfaces |
| `--white-80` | `rgba(255,255,255,0.80)` | Frosted overlays |
| `--white-50` | `rgba(255,255,255,0.50)` | Subtle fills |
| `--white-30` | `rgba(255,255,255,0.30)` | Dividers, borders |
| `--white-20` | `rgba(255,255,255,0.20)` | Faint accents |
| `--black-80` | `rgba(28,28,28,0.80)` | Body text |
| `--black-70` | `rgba(28,28,28,0.70)` | Secondary text |
| `--black-10` | `rgba(28,28,28,0.10)` | Disabled states |

### Gradient Presets

```css
/* Blue → Pink accent gradient (glass cards) */
linear-gradient(135deg, rgba(23,185,230,0.15), rgba(252,148,197,0.1))

/* Blue-tinted glass */
linear-gradient(135deg, rgba(23,185,230,0.08), rgba(23,185,230,0.03))

/* Background underlay */
radial-gradient(ellipse at 50% 0%, rgba(23,185,230,0.06) 0%, transparent 70%)
```

---

## Typography

### Font Stack

| Role | Family | Weight | Tracking | Usage |
|---|---|---|---|---|
| Display / Logo | **Rozha One** | 400 | `0.12em` | Brand mark, hero headings |
| Headings | **Rozha One** | 400 | `0.08em` | H1–H3, section titles |
| Body / UI | **Poppins** | 600 (SemiBold) | `0.01em` | Buttons, labels, body text |
| Data / Cards | **Inter** | 400–600 | `0` | Itinerary cards, metadata |

### Type Scale

| Level | Size | Line Height | Font |
|---|---|---|---|
| Logo | `32px` | `1.1` | Rozha One |
| H1 | `28px` | `1.2` | Rozha One |
| H2 | `22px` | `1.3` | Rozha One |
| H3 | `18px` | `1.4` | Rozha One |
| Body | `16px` | `1.5` | Poppins 600 |
| Small | `14px` | `1.5` | Poppins 600 |
| Caption | `12px` | `1.4` | Inter |

---

## Spacing & Layout

### Spacing Tokens

| Token | Value | Usage |
|---|---|---|
| `--spacing-xs` | `8px` (0.5rem) | Tight gaps, inline padding |
| `--spacing-sm` | `16px` (1rem) | Component internal padding |
| `--spacing-md` | `24px` (1.5rem) | Card padding, section gaps |
| `--spacing-lg` | `32px` (2rem) | Section separation |
| `--spacing-xl` | `48px` (3rem) | Page-level vertical rhythm |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `8px` | Buttons, inputs, small cards |
| `--radius-md` | `12px` | Cards, panels |
| `--radius-lg` | `16px` | Modals, hero containers |

### Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 5px 20px rgba(0,0,0,0.04)` | Cards, elevated surfaces |
| `--shadow-md` | `0 6px 18px rgba(0,0,0,0.2)` | Modals, popovers, focus states |

---

## Glassmorphism System

The signature visual pattern across the product. All glass effects share:
- `backdrop-filter: blur(10–15px)`
- 1px top-edge reflection (`inset 0 1px 0 rgba(255,255,255,0.4)`)
- Inner glow via `box-shadow`
- `transition: all 0.3s ease`

### Glass Variants

| Class | Background | Blur | Use Case |
|---|---|---|---|
| `.glass-effect` | Blue gradient @ 8% | `10px` | Standard containers |
| `.glass-card` | Blue→Pink gradient | `15px` | Feature cards, itinerary items |
| `.glass-panel` | Blue tint @ 3% | `10px` | Sidebars, navigation |
| `.form-container` | White @ 95% | `15px` | Input forms, auth screens |
| `.venue-glass` | White @ 85% | `12px` | Venue cards with hover lift |
| `.datetime-card` | White @ 90% | `10px` | Date/time input wrappers |

---

## Component Library

Built on **Radix UI** primitives with **shadcn/ui** styling. 49 components available:

### Core Controls
`Button` · `Input` · `Label` · `Select` · `Checkbox` · `Radio` · `Toggle` · `Switch` · `Slider`

### Layout & Navigation
`Card` · `Tabs` · `Accordion` · `Sidebar` · `Breadcrumb` · `Pagination` · `Separator`

### Overlays & Feedback
`Dialog` · `Sheet` · `Drawer` · `Popover` · `Dropdown` · `Tooltip` · `HoverCard` · `AlertDialog` · `Toast`

### Data Display
`Table` · `Badge` · `Avatar` · `Skeleton` · `Progress` · `Chart`

### Specialized
`Calendar` · `Carousel` · `Command` · `InputOTP` · `Collapsible`

### Custom Components

| Component | Purpose |
|---|---|
| `InputScreen` | City + date + interest form with glass styling |
| `ItineraryScreen` | AI-generated venue timeline with travel info |
| `VenueSwiper` | Embla carousel for browsing venue cards |
| `CitySelector` | 11-city grid picker with flag icons |
| `LanguageSwitcher` | EN/繁中 toggle |
| `TopNav` | Persistent header with auth + settings |
| `Logo` | Rozha One brand mark |
| `ExamplePrompts` | Suggested activity templates |
| `LoadingScreen` | Branded loading state with spinner |

---

## Motion & Animation

### Transitions
- **Default**: `all 0.3s ease` — hover states, glass effects
- **Venue cards**: `transform 0.3s ease` — lift on hover (`translateY(-2px)`)
- **Page transitions**: Framer Motion fade/slide

### Animation Library
- **Framer Motion** — page transitions, list animations, layout shifts
- **Embla Carousel** — venue swiping with momentum physics
- **CSS Keyframes** — spinner rotation, subtle pulse effects

### Interaction Principles
1. Every interactive element has a hover/focus state
2. Transitions feel physical — no abrupt changes
3. Loading states use branded spinners, never generic
4. Carousels respect touch gestures and momentum

---

## Responsive Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | `< 640px` | Single column, full-width cards, bottom sheet navigation |
| Tablet | `640–1024px` | Two-column grid, side panels |
| Desktop | `> 1024px` | Multi-column layout, persistent sidebar |

---

## Iconography

- **Primary**: Lucide React (`lucide-react`) — 1000+ consistent stroke icons
- **Supplementary**: React Icons (`react-icons`) — brand icons, extended set
- **Style**: 24px default, 1.5px stroke, rounded caps
- **Color**: Inherits `currentColor` — never hardcoded

---

## Platform Support

| Platform | Technology | Notes |
|---|---|---|
| Web | React + Vite | Primary experience, SSR-ready |
| iOS | Capacitor 7 | Native wrapper, App Store deployed |
| Android | Capacitor 7 | Native wrapper |

---

## Remotion Video System

Remotion is installed for programmatic video generation — ideal for:

- **Product demos** — animated walkthroughs of the itinerary flow
- **Social content** — city highlight reels with venue cards
- **Pitch decks** — YC-style product videos with data overlays
- **App Store previews** — polished screen recordings with motion graphics

### Remotion Setup

```
remotion/
├── Root.tsx              # Composition registry
├── compositions/
│   ├── ProductDemo.tsx   # Full product walkthrough
│   ├── CityHighlight.tsx # Per-city social clips
│   ├── VenueCard.tsx     # Animated venue card component
│   └── ItineraryFlow.tsx # Step-by-step itinerary animation
├── components/           # Shared Remotion components
└── assets/               # Static assets for video
```

### Video Design Tokens
All video compositions should use the same design tokens defined above — brand colors, typography, glassmorphism, and spacing — to maintain visual consistency between the product and its marketing materials.

---

## Design Principles

1. **Glass over solid** — prefer frosted surfaces over opaque blocks
2. **Blue leads, pink accents** — primary actions are blue, secondary/decorative is pink
3. **Serif for impact, sans for utility** — Rozha One commands attention, Poppins gets things done
4. **Breathe** — generous spacing creates premium feel; never crowd elements
5. **Animate with purpose** — motion guides the eye, never distracts
6. **Mobile-native feel** — even on web, interactions should feel like a native app

---

*This design system is the single source of truth for all visual decisions across web, mobile, and video content.*
