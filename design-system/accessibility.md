# Accessibility

## Baseline rules

- Every interactive element must be keyboard reachable.
- Focus indicators must be visible and distinct.
- Color contrast must remain strong on dark surfaces.
- Do not rely on color alone to communicate meaning.
- Use semantic HTML first, ARIA only when needed.
- Avoid motion or glow that reduces legibility.

## Forms

- Label every input.
- Tie helper and error text to the field.
- Ensure validation messages are concise and actionable.
- Make error states obvious without requiring color perception.
- Private contact forms should clearly explain what happens after submit.

## Buttons and controls

- Maintain touch targets of at least 44px.
- Keep disabled states visually distinct but still readable.
- Provide sufficient spacing between adjacent controls.
- On mobile, keep primary CTAs large enough for one-handed use.

## Navigation

- Indicate the current location clearly.
- Make skip or quick-jump patterns available when navigation is dense.
- Keep the active item visible in both desktop and mobile patterns.

## Motion

- Use motion to clarify state changes, not to decorate every surface.
- Respect reduced-motion preferences for animated or auto-moving elements.
- Avoid heavy looping effects, excessive pulse animation, or attention-grabbing motion in the hero area.

## Tables

- Use semantic table markup when the data is tabular.
- Keep headers associated with data cells.
- Provide non-color indicators for status values.

## Modals

- Trap focus while open.
- Close on Escape when appropriate.
- Return focus to the triggering element after close.
- The +18 modal must offer accessible accept and decline actions with clear labels.
- Keep the modal copy short, neutral, and easy to understand.

## Empty and loading states

- Announce meaningful changes where assistive technology needs it.
- Do not leave users guessing about whether content is still loading or actually missing.
- Loading states should preserve the premium layout instead of collapsing into blank space.

## QA checklist

Before considering a UI update complete:

1. Can it be used with keyboard only?
2. Are focus states easy to see?
3. Is the contrast strong enough?
4. Does the mobile layout remain usable?
5. Are errors understandable without color?
6. Does the age-verification modal work cleanly with keyboard and screen-reader navigation?
