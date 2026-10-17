---
name: The Living Gallery
colors:
  surface: '#f8faf6'
  surface-dim: '#d8dbd7'
  surface-bright: '#f8faf6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f0'
  surface-container: '#eceeeb'
  surface-container-high: '#e7e9e5'
  surface-container-highest: '#e1e3df'
  on-surface: '#191c1a'
  on-surface-variant: '#3d4a43'
  inverse-surface: '#2e312f'
  inverse-on-surface: '#eff1ed'
  outline: '#6c7a72'
  outline-variant: '#bbcac1'
  surface-tint: '#006c4e'
  primary: '#006c4e'
  on-primary: '#ffffff'
  primary-container: '#10b183'
  on-primary-container: '#003c2a'
  inverse-primary: '#55ddac'
  secondary: '#4b5d8b'
  on-secondary: '#ffffff'
  secondary-container: '#b8cbff'
  on-secondary-container: '#425582'
  tertiary: '#676000'
  on-tertiary: '#ffffff'
  tertiary-container: '#b7ae41'
  on-tertiary-container: '#454100'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#75fac7'
  primary-fixed-dim: '#55ddac'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#00513a'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b3c6fa'
  on-secondary-fixed: '#011944'
  on-secondary-fixed-variant: '#324672'
  tertiary-fixed: '#f0e672'
  tertiary-fixed-dim: '#d3ca59'
  on-tertiary-fixed: '#1f1c00'
  on-tertiary-fixed-variant: '#4d4800'
  background: '#f8faf6'
  on-background: '#191c1a'
  surface-variant: '#e1e3df'
typography:
  display-hero:
    fontFamily: Fraunces
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 76px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Fraunces
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Fraunces
    fontSize: 44px
    fontWeight: '400'
    lineHeight: 54px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Fraunces
    fontSize: 30px
    fontWeight: '400'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Fraunces
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 42px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Fraunces
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  title-editorial:
    fontFamily: Fraunces
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '300'
    lineHeight: 31px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 22px
  label-caps:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.12em
  metadata-curatorial:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-tablet: 2rem
  gutter-desktop: 3rem
  margin: 1.25rem
  margin-tablet: 2.5rem
  margin-desktop: 4.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.75rem
  space-xl: 3rem
---

## Brand & Style

This design system embodies a quiet, meditative, and luxurious museum atmosphere dedicated to Vietnamese green art education. The visual narrative treats digital space as a curated white-cube gallery rooted in ecological consciousness, heritage materials, and scholarly craft.

The design movement blends high-editorial organic minimalism with classical architectural motifs. Prominent visual hallmarks include:
- **Curated Silence:** Generous negative space that allows ecological artworks, natural pigments, and scholarly research to breathe.
- **Architectural Portals:** Arch silhouettes reminiscent of traditional Vietnamese entryways and French-colonial conservatory glasshouses.
- **Exhibition Metadata:** Editorial curatorial labeling (catalog numbers, material origin, geographic provenance) treated as first-class UI hierarchy.
- **Sensory Nuance:** Translucent organic overlays, microscopic hairline framing, and subdued atmospheric contrasts instead of harsh digital boundaries.

## Colors

The palette is strictly curated to evoke coastal conservation, botanical specimens, and classical institutional prestige.

- **Primary (`#10B183` · Emerald):** The vital pulse. Applied to primary interactive triggers, progress indicators, key callouts, and selected states.
- **Secondary (`#20345F` · Deep Blue):** The authoritative anchor. Employed for monumental typography, midnight gallery viewing chambers ("deep sea" inverted surfaces), primary iconography, and structural line art.
- **Tertiary (`#E7DD6A` · Canary):** The illuminated pearl. Constrained strictly to under 5% visual surface area. Used exclusively for active museum room markers, rare provenance dots, focal badges, and audio-guide indicators.
- **Neutral Canvas (`#F8FAF6` · Soft White):** The gallery plaster. Serves as the primary ambient canvas, eliminating high-glare clinical white in favor of soft, natural linen light.
- **Atmospheric Layer (`#EAF8F3` · Mint Mist):** Used for tactile section backdrops, framed pedestals, and low-contrast surface card elevation.
- **Body & Typography (`#1E2A32` · Charcoal):** Deep slate pigment optimizing editorial readability across Vietnamese tone markers and extensive educational prose.

### Strict Color Rules
- Never use solid black (`#000000`) or pure digital white (`#FFFFFF`) for semantic surfaces or text.
- Structural hairline borders must be rendered using Deep Blue at 12% opacity (`rgba(32, 52, 95, 0.12)`).
- Canary `#E7DD6A` must never be used for extended surface fills or body text; it functions solely as an incandescent pinpoint or micro-badge.

## Typography

The typographic expression rests on the tension between academic classicism and functional modernist legibility.

- **Display & Headlines (Fraunces):** Chosen for its warmth, calligraphic softness, and exquisite optical balancing with Vietnamese diacritical marks. Headlines leverage Fraunces in sentence case. Italic variants are strictly reserved for cultural phrases, botanical species, artwork titles, or reflective editorial quotes.
- **Body & UI (Be Vietnam Pro):** Engineered for native Vietnamese diacritics and international clarity. Body text maintains a generous line height multiplier of 1.7 to 1.75 to ensure complex tone markings remain unobstructed.
- **Curatorial Tracking:** All micro-labels, category markers, and catalog indices utilize uppercase `Be Vietnam Pro` tracked out by +12% (`0.12em`) to mirror archival exhibition typography.

## Layout & Spacing

The layout is built upon an exhibition floor plan metaphor, utilizing an asymmetrical 12-column responsive grid that honors contemplative vertical flow.

### Grid & Breakpoints
- **Mobile (< 768px):** 4-column system with `1.25rem` outer canvas margins and `1.5rem` gutters. Elements stack vertically into curated artifact views.
- **Tablet (768px - 1024px):** 8-column system with `2.5rem` outer margins and `2rem` gutters. Two-column curation pairs metadata beside primary imagery.
- **Desktop (> 1024px):** 12-column asymmetric layout with `4.5rem` outer margins and `3rem` gutters. Content intentionally offsets: artworks occupy 7 columns while curatorial wall text occupies 4 columns with a 1-column silent void.

### Rhythmic Intervals
Vertical pacing between gallery halls (sections) expands dramatically (`6rem` to `9rem` on desktop) to evoke the physical sensation of stepping from one climate-controlled gallery room into another.

## Elevation & Depth

Visual hierarchy rejects intense drop shadows and industrial layering in favor of luminous, diffused, natural lighting.

- **Ambient Gallery Shadows:** Elevation is expressed through low-density, wide-dispersion shadows tinted with Deep Blue: `0 16px 36px -12px rgba(32, 52, 95, 0.08)`. For hovered artworks or modals: `0 28px 60px -16px rgba(32, 52, 95, 0.12)`.
- **Atmospheric Pedestals:** Flat depth is articulated via tone-on-tone backing: nesting Mint Mist (`#EAF8F3`) upon Soft White (`#F8FAF6`) creates clear surface transitions without elevation lines.
- **Hairline Precision:** Surfaces terminate with a 1px structural hairline border rendered as `rgba(32, 52, 95, 0.12)`.
- **Textural Overlay:** Watermarked, delicate scalloped motifs (inspired by traditional ceramic glaze and wave scales) sit at `5%` opacity in the background of transitional chambers.
- **Deep Sea Inversion:** In educational deep-dive sections, the canvas flips entirely to Deep Blue (`#20345F`) with Soft White typography and Emerald glowing accents to invoke underwater conservation realms.

## Shapes

The design system merges stark architectural geometry with botanical curvature:

- **Arch Silhouette Frames:** Artwork hero portraits, educational portals, and featured gallery exhibits use arched framing: `border-radius: 140px 140px 20px 20px` (or `90px 90px 16px 16px` on mobile). This mimics botanical conservatories and French-Vietnamese museum halls.
- **Pill Philosophy:** Interactive elements (buttons, filter chips, audio tags) utilize complete pill geometry (`roundedness: 3` / `9999px`) to communicate smoothness like polished river stones.
- **Pedestal Cards:** Exhibition info cards utilize subtle rounded corners (`16px` to `20px`) bounded by 1px hairlines.

## Components

### Buttons
- **Primary Action:** Full pill shape (`border-radius: 9999px`). Background is vibrant Emerald (`#10B183`) with bold Deep Blue (`#20345F`) or Charcoal (`#1E2A32`) typography. Internal padding: `14px 28px`. Hover introduces a subtle scale transformation (`1.02`) and shadow softening.
- **Secondary Action:** Pill-shaped outline with a 1px hairline border in `rgba(32, 52, 95, 0.25)` and Deep Blue text. Hover fills background with Mint Mist (`#EAF8F3`).
- **Inverted Sea Mode:** Deep Blue background surfaces employ Mint Mist or Emerald button fills with Deep Blue labeling.

### Museum Wall Labels (Curatorial Placards)
- Structural UI blocks mimicking physical gallery placards.
- Placed directly adjacent to art modules or floating along the edge of arch frames.
- Format: `Nº [0-9]{3}` in Canary `#E7DD6A` or Emerald `#10B183`, followed by `·` bullet separator, medium-weight material specification, and uppercase provenance (`Cần Thơ`, `Hà Nội`, `Đà Nẵng`).
- Typography: `metadata-curatorial` (`11px`, `0.06em` tracking) in Charcoal at 70% opacity.

### Arch Cards & Specimen Frames
- Container constructed with `border-radius: 140px 140px 20px 20px`.
- Enclosed with a 1px Deep Blue hairline border at 12% opacity.
- Media within scales smoothly on interaction, framed by an internal Mint Mist mat board margin (`12px`).

### Filter Chips & Navigation Tabs
- Unselected: Soft White fill with a 1px border (`rgba(32, 52, 95, 0.12)`) and Charcoal label.
- Selected: Emerald fill (`#10B183`) with Deep Blue text and an inset 6px Canary dot (`#E7DD6A`) positioned leading the label text.

### Form Inputs & Checkboxes
- **Inputs:** Clean, open fields on Soft White background, underlined or bordered by 1px hairline `rgba(32, 52, 95, 0.16)`. Focused state shifts the hairline to solid Emerald (`#10B183`) with a soft mint glow ring (`0 0 0 3px rgba(16, 177, 131, 0.15)`).
- **Checkboxes & Radios:** Circular or rounded 6px squares. Unchecked state is bordered in Deep Blue hairline; checked state is solid Emerald hosting a crisp Soft White checkmark or Canary focal dot.

### Scroll Progress Indicator
- Fixed to the extreme top edge of the viewport.
- A 2px high continuous horizontal line rendered in Emerald (`#10B183`), terminating with a micro Canary (`#E7DD6A`) point that charts reader movement through the exhibition narrative.