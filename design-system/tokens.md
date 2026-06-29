# Tokens

These tokens are the recommended implementation vocabulary for the current product system.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-background` | `#050507` | App background |
| `--color-foreground` | `#f5eee7` | Primary text and foreground |
| `--color-primary` | `#ab1533` | Main CTA, active nav, premium signal |
| `--color-primary-hover` | `#d11f42` | Hover / active brand emphasis |
| `--color-accent` | `#d65a23` | Warm highlight, membership emphasis |
| `--color-accent-fire` | `#ff8a2a` | Strongest warm highlight in small doses |
| `--color-muted` | `#8d7a76` | Secondary text and metadata |
| `--color-border` | `#27171d` | Default borders |
| `--color-card` | `#100a0e` | Standard cards and panels |
| `--color-card-hover` | `#170d12` | Hovered / active surfaces |
| `--color-destructive` | `#ef5c67` | Error / destructive states |
| `--color-ring` | `#f2b46a` | Focus rings and accessibility emphasis |
| `--color-success` | `#37c875` | Success states |
| `--color-warning` | `#e2b24b` | Warning states |
| `--color-error` | `#ef5c67` | Error states |

## Typography tokens

| Token | Value | Use |
| --- | --- | --- |
| `--font-body` | `Inter, system-ui, sans-serif` | General body copy |
| `--font-heading` | `Cormorant Garamond, Georgia, serif` | Editorial headings and premium titles |
| `--font-mono` | `IBM Plex Mono, ui-monospace, SFMono-Regular, monospace` | Prices, ids, technical values |
| `--text-body-size` | `16px` | Base readable size |
| `--text-body-line-height` | `1.55` | Standard reading rhythm |
| `--text-heading-line-height` | `1.1` | Compact headline rhythm |

## Spacing tokens

| Token | Value |
| --- | --- |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `24px` |
| `--space-6` | `32px` |
| `--space-7` | `40px` |
| `--space-8` | `48px` |
| `--space-9` | `64px` |

## Radius tokens

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` | `8px` | Small controls |
| `--radius-md` | `14px` | Inputs, chips, compact cards |
| `--radius-lg` | `18px` | Standard cards |
| `--radius-xl` | `24px` | Modals, large panels |
| `--radius-full` | `999px` | Pills and badges |

## Shadow tokens

| Token | Value | Use |
| --- | --- | --- |
| `--shadow-sm` | `0 4px 12px rgba(0, 0, 0, 0.22)` | Small elevation |
| `--shadow-md` | `0 16px 36px rgba(0, 0, 0, 0.32)` | Standard elevation |
| `--shadow-lg` | `0 30px 78px rgba(0, 0, 0, 0.48)` | Panels and modals |
| `--shadow-brand` | `0 20px 46px rgba(209, 31, 66, 0.26)` | Primary action emphasis |
| `--shadow-accent` | `0 20px 46px rgba(214, 90, 35, 0.18)` | Limited highlight use |

## Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `--motion-fast` | `120ms` | Hover and focus transitions |
| `--motion-standard` | `180ms` | Most UI transitions |
| `--motion-slow` | `240ms` | Modal and panel transitions |

## Recommended CSS variable mapping

Use these tokens as CSS custom properties first. If a future Tailwind or component library migration happens, map them into the framework theme instead of redefining the palette.

## Implementation notes

- Keep red values controlled and avoid using them for large text blocks or full-screen fills.
- Use `--color-card-hover` for lift states instead of bright borders everywhere.
- Let `--color-ring` be visible even on dark gradients.
- Reserve `--color-accent-fire` for conversion moments, age-verification emphasis, and premium highlights.
