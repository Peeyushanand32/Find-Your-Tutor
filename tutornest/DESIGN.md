---
name: TutorNest
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#525657'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b6e70'
  on-tertiary-container: '#eff1f3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  unit-xs: 4px
  unit-sm: 8px
  unit-md: 16px
  unit-lg: 32px
  unit-xl: 64px
  deep-padding: 80px
---

## Brand & Style
The design system is engineered for a premium EdTech SaaS environment that balances academic rigor with modern agility. The brand personality is professional and trustworthy, yet remains forward-looking through a "Futuristic Minimalist" aesthetic. 

The visual strategy utilizes a clean white foundation to maximize readability, paired with sophisticated glassmorphism to imply depth and technical sophistication. High-performance "deep padding" is used to reduce cognitive load for students and educators alike. The emotional response should be one of clarity, speed, and premium quality.

## Colors
The palette is anchored by a "Stark White" base to establish a clean, academic atmosphere. Vibrancy is introduced through a Primary Blue and Secondary Purple, often utilized as a linear gradient for high-impact CTAs and progress indicators. 

- **Primary & Secondary:** Used for interactive elements and brand-heavy moments.
- **Surface:** Pure white (#FFFFFF) is the standard background, while the Tertiary grey is used for subtle sectioning.
- **Glassmorphism:** Applied to overlays and floating navigation bars using a semi-transparent white tint with a 12px-20px backdrop-blur.

## Typography
This design system employs a high-contrast typographic pairing. **Space Grotesk** provides a technical, geometric edge for headlines, signaling innovation and precision. **Inter** is utilized for all functional and long-form text to ensure maximum legibility and a professional tone.

Headlines should utilize tighter letter-spacing and line-heights to maintain a "locked-in" editorial look. Body copy scales down for mobile but maintains a generous 1.6x line-height to ensure the interface feels airy and accessible.

## Layout & Spacing
The layout follows a 12-column fluid grid for desktop, transitioning to 4 columns on mobile. "Deep padding" is the signature of this design system; vertical sections are separated by `unit-xl` or `deep-padding` to prevent visual clutter.

Containers use a fixed maximum width for content-heavy pages but allow for full-width glassmorphic backgrounds. Elements should align strictly to the grid, but use generous internal padding (minimum `unit-md`) within cards and modals to maintain the premium, spacious feel.

## Elevation & Depth
Depth is created through "Soft Layering" rather than heavy shadows. The primary method for elevation is the use of backdrop blurs (glassmorphism) on elevated surfaces like headers, dropdowns, and floating cards.

- **Level 0:** Base white background.
- **Level 1:** Subtle 1px border (#E2E8F0) with no shadow, used for secondary cards.
- **Level 2 (Elevated):** Glassmorphic background with a very soft, diffused primary-tinted shadow (0px 10px 30px rgba(37, 99, 235, 0.05)).
- **Level 3 (Modal/Top):** Significant backdrop blur (20px) with a semi-transparent white fill and a crisp 1px highlight border.

## Shapes
The shape language is modern and approachable. A standard 0.5rem (8px) radius is applied to small components like inputs and small buttons. Larger containers, such as dashboard cards and featured course blocks, use the `rounded-xl` (1.5rem / 24px) setting to evoke a friendly, contemporary SaaS aesthetic. Interactive elements should never be sharp-edged.

## Components
- **Buttons:** Primary buttons use the Blue-to-Purple gradient with white text. Secondary buttons are "Ghost" style with a thin border. Hover states should include a subtle scale-up (1.02x) and an increased shadow spread.
- **Input Fields:** Minimalist design with a 1px light grey border that transitions to a Primary Blue border on focus. Use Inter for input text.
- **Cards:** Dashboard cards should be white or glassmorphic. They must have deep internal padding (`unit-lg`) and use Space Grotesk for titles.
- **Chips/Labels:** Used for subject tags (e.g., "Mathematics"). These should have a subtle background tint of the primary color with high-contrast text.
- **Iconography:** Use 1.5pt stroke-width icons. Icons should be monochrome (Slate) unless they are part of a primary action, where they can inherit the gradient.
- **Progress Bars:** Thin, sleek lines using the primary gradient to indicate course completion or student growth.