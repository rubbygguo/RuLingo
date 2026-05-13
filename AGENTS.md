# RuLingo Agent Guidelines

## Project Context

RuLingo is a personal English learning system. UI changes should favor focused learning workflows over marketing-style pages.

## Responsive UI Requirements

Every new UI feature or UI change must support desktop, MatePad/tablet, and mobile phone layouts.

Use these breakpoints as the project default:

- Desktop: `>= 1080px`
- Tablet/MatePad: `768px - 1079px`
- Mobile: `< 768px`

When building or changing UI:

- Prefer Mantine components over custom controls.
- Reuse the existing responsive shell, drawer, bottom navigation, card, form, and toolbar patterns before adding new layout primitives.
- Keep mobile layouts compact and touch-friendly.
- Avoid horizontal overflow on MatePad and phone screens.
- Use single-column content on mobile unless a denser control is clearly more usable.
- Keep date controls, filters, segmented controls, and toolbars compact on mobile.
- Let filter/tag/segmented groups scroll horizontally on small screens instead of wrapping into tall blocks.
- Use stable dimensions for buttons, cards, task rows, and toolbar controls so dynamic content does not shift layout.
- Keep text readable and avoid oversized desktop typography on tablet and mobile.
- Preserve bottom safe area spacing when fixed mobile navigation is present.
- Use existing CSS variables and responsive patterns in `src/styles.css`.

## Verification

Before finishing frontend changes:

- Run `npm run build`.
- When practical, check representative viewport sizes:
  - Phone: `390x844` or `430x932`
  - MatePad/tablet: `820x1180` or `1024x1366`
  - Desktop: `1440x900`

If visual verification is not possible, mention that in the final response.
