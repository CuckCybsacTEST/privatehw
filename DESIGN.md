---
version: alpha
name: Noir After Dark
description: Premium night-club-inspired product system for private, mobile-first, high-conversion experiences with a dark, exclusive, cinematic mood.
colors:
  background: "#050507"
  foreground: "#f5eee7"
  primary: "#ab1533"
  primary-hover: "#d11f42"
  accent: "#d65a23"
  accent-fire: "#ff8a2a"
  muted: "#8d7a76"
  border: "#27171d"
  card: "#100a0e"
  card-hover: "#170d12"
  destructive: "#ef5c67"
  ring: "#f2b46a"
  success: "#37c875"
  warning: "#e2b24b"
  error: "#ef5c67"
typography:
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  heading:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.92rem"
    fontWeight: 500
rounded:
  xs: "8px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
  4xl: "48px"
  5xl: "64px"
---

# Noir After Dark

## Visual Personality

The product should feel like a private, premium night club: dark, elegant, seductive, exclusive, and cinematic. It should imply heat, privacy, and desire without becoming vulgar or literal.

The visual language should combine:

- deep black and wine-black surfaces
- premium red and controlled fire accents
- soft radial glows and smoky atmospheric depth
- editorial typography with modern utility text
- strong conversion CTAs on dark surfaces
- mobile-first composition that still feels luxurious
- subtle motion that feels nocturnal, not flashy

## Design Principles

1. Make the experience feel private and invite-only.
2. Keep the home page suggestive, not over-revealing.
3. Use red as a signal, not a flood.
4. Preserve legibility on every surface.
5. Keep primary actions high contrast and unmistakable.
6. Avoid cheap casino visuals, legacy adult-site clutter, and generic SaaS layouts.

## Color System

### Palette direction

- Base background: blackened charcoal with wine undertones.
- Surface layers: deep plum, smoke-black, and dark oxblood.
- Brand accent: premium blood red, used sparingly and with intention.
- Secondary accent: ember orange and amber for heat, value, and focus.
- Semantic colors: calm success green, caution amber, and restrained error red.

### Usage rules

- Use `primary` for the main CTA, active nav, and conversion moments.
- Use `primary-hover` to signal interaction, not to change the whole palette.
- Use `accent` for premium callouts, member value, and restrained highlights.
- Use `accent-fire` for the strongest emphasis, only in small doses.
- Use `muted` for secondary text and privacy-supporting metadata.
- Use `card` and `card-hover` for layered surfaces, never pure white.
- Use `success`, `warning`, and `error` only for status and feedback.
- Never use red as a long-form text background.
- Do not saturate the full screen with red; let glow and contrast do the work.

## Typography

- Headings should feel editorial, intimate, and expensive.
- Body text must stay modern and highly legible.
- Buttons and short UI labels should remain clean and practical.
- Prices, dates, identifiers, and verification states may use mono for clarity.
- Avoid overly theatrical scripts or decorative fonts that reduce trust.
- Keep line lengths comfortable on mobile and desktop.

## Spacing

- Use an 8px rhythm with generous breathing room.
- Prioritize `16`, `24`, `32`, `40`, and `48` pixel steps for major surfaces.
- Use tighter spacing only inside compact chips or control clusters.
- Preserve touch targets and readable hierarchy on mobile.

## Radius

- Small controls: subtle rounding.
- Cards and panels: smooth premium rounding.
- Feature surfaces and modals: slightly larger, softer corners.
- Pills and badges: full rounding only when intentionally compact.
- Avoid mismatched radii that make the UI feel assembled from unrelated parts.

## Shadows and Depth

- Use shadows to suggest hidden depth, not to look flashy.
- Lower surfaces should sit close to the background and feel private.
- Elevated surfaces may use soft outer shadows, wine tints, and subtle ember glows.
- Brand-accent glow must be restrained and reserved for key CTAs or active states.
- Use faint atmospheric gradients or smoke-like washes, never noisy textures.

## State System

### Hover

- Slight lift, stronger border, or warmer edge glow.
- No large motion or carnival-like effects.
- Hover should feel expensive and responsive, not loud.

### Active / pressed

- Reduce elevation.
- Add a tiny scale-down or translate-down effect.
- Keep the response immediate and tactile.

### Disabled

- Lower opacity.
- Remove strong glow and accent emphasis.
- Preserve readability and semantics.

### Loading

- Prefer skeletons for content blocks.
- Prefer inline spinners only for short actions.
- Never show a blank screen when content can be staged.

### Error

- Use error color for borders, labels, and short helper text.
- Keep error copy short and actionable.

### Success

- Use success color for confirmed completion, saved state, or successful verification-like flows.

### Warning

- Use warning color for caution, partial completeness, or attention-needed states.

## Dashboard Rules

- Dashboards should feel operational but still premium.
- Show key metrics first, supporting context second.
- Use cards or panels to group related metrics.
- Keep filters visible and easy to reach.
- Charts and tables should never overpower the visual mood.
- Empty or low-data dashboards should still feel intentional and exclusive.

## Form Rules

- Every field needs a clear label.
- Helper text should explain, not repeat the label.
- Errors should appear near the field and be easy to associate.
- Primary submit actions should be visually dominant.
- Secondary actions should remain clearly secondary.
- Forms that ask for private contact details should feel safe and premium.
- Inputs must feel consistent across the app.

## Table Rules

- Tables must be legible at a glance.
- Use clear row separation or subtle banding.
- Keep headers sticky if the table is dense.
- Right-align numeric values where it helps comparison.
- Avoid cramped columns and unnecessary icon clutter.
- On smaller screens, convert to cards or stacked rows when the table cannot remain readable.

## Card Rules

- Cards should define a clear content unit.
- Use cards to organize preview content, membership options, feature teasers, and exclusive offers.
- Card headers should communicate the main value quickly.
- Use subtle gradients, border glow, and layered depth rather than flat outlines alone.
- Cards should feel private, premium, and curated.

## Modal Rules

- Use modals only for focused tasks, confirmations, age verification, or high-value details.
- Backdrop must dim the background enough to preserve focus and privacy.
- Modal content should never exceed viewport comfort on mobile.
- Close actions must be obvious and keyboard accessible.
- Avoid stuffing multiple unrelated tasks into a single modal.

## Navigation Rules

- Navigation should be simple, direct, and always visible when needed.
- Highlight the current location clearly.
- On mobile, use compact navigation that preserves touch target size.
- Keep the number of primary navigation destinations small.
- Navigation should feel private and invitation-like, not like a generic admin shell.

## Empty State Rules

- Empty states should explain the condition and the next action.
- They should feel intentional, not broken.
- Use a single clear CTA when a next step exists.
- Avoid decorative illustrations unless they add clarity.
- Tone should feel exclusive and calm, not apologetic.

## Responsive Rules

- Mobile-first implementation is mandatory.
- Keep layout logic simple across breakpoints.
- Preserve touch target size on small screens.
- Reduce density only where necessary.
- Do not rely on hover to convey critical meaning.

## Accessibility Baseline

- Maintain visible focus states.
- Ensure contrast is strong on all core surfaces.
- Support keyboard navigation for all interactive elements.
- Use semantic HTML where possible.
- Do not encode meaning through color alone.
- Respect reduced-motion preferences when animations are added.

## Anti-Patterns

Do not generate:

- generic SaaS dashboards
- casino-like neon overload
- flat, template-like admin shells
- excessive glassmorphism
- decorative motion without purpose
- crowded cards with no hierarchy
- tiny touch targets on mobile
- loud full-screen red backgrounds
- noisy icon-only controls without labels
- explicit or vulgar styling cues

## Source of Truth

If there is a conflict between a page, component, or migration note and this file, `DESIGN.md` wins.
