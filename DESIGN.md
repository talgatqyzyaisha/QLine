---
version: alpha
name: QLine
description: A calm dental marketplace for Kazakhstan, with booking as the visual centre.
colors:
  primary: '#175CD3'
  secondary: '#14B8A6'
  background: '#F8FAFC'
  surface: '#FFFFFF'
  text: '#101828'
  muted: '#667085'
  border: '#E4E7EC'
  success: '#067647'
  danger: '#B42318'
typography:
  display:
    fontFamily: 'Manrope, Arial, sans-serif'
  sans:
    fontFamily: 'Inter, Arial, sans-serif'
rounded:
  DEFAULT: '12px'
  card: '16px'
spacing:
  section-gap: '80px'
  page-max: '1240px'
components:
  button: { minHeight: '46px' }
  card: { borderRadius: '16px' }
  dialog: { maxWidth: '620px' }
---
# QLine design system
## Overview
Hybrid: welcoming public marketplace, quiet utility inside patient and clinic workspaces. Audience: RU/KZ users in Kazakhstan, primarily mobile. Brief is the product source (PRODUCT.md). Signature: a large blue-accented two-line title and a white booking bar overlapping an architectural dental photograph; the Q symbol becomes an appointment line. No fake social proof, gradients or dense legacy CRM chrome.
Runtime CSS in Frontend/styles.css is the canonical token source; this file mirrors it. All shared controls consume those CSS variables. Change both together. No generated framework adapters.
## Colors
Primary for main actions, turquoise only for small accents. Green means a completed state; pending is amber. White cards on cool grey. Scrollbars use muted thumb on background. Light theme only; forced colors remain operable.
## Typography
Manrope display, Inter body, Arial fallback supports Cyrillic and Kazakh. Headings 56/1.12 desktop, 36/1.15 mobile; body 15/1.6. Workspace numerals use tabular figures. Fonts are optional enhancements: no content depends on their loading.
## Layout
1240px content maximum, fluid 16–32px gutters plus device safe areas. 80px section rhythm, 56px below 768px. Full navigation switches to a disclosure at 1180px; clinic actions remain in the menu below 480px. Clinic cards: three/two/one columns at desktop/1180px/640px. Services: four/two/one columns at desktop/1024px/359px. Catalog filters become an inline disclosure at 1024px, before the results. At 640px shared tables reflow into labelled row cards, retaining all actions and table roles. Calendar: seven columns on desktop, two-day week cards on tablets, single-day agenda on phones; month view uses four/two/one columns at 1024/640/480px. Booking forms precede their full summary on mobile; no summary fields are hidden. Forms use natural document scroll, 16px inputs, and at least 44px primary touch targets. Navigation rails may scroll within their own width. No document-wide clipping to conceal overflow. Breakpoint contract covers 320px through ultrawide screens and short landscape screens; actual browser verification remains pending.
## Elevation & Depth
Fine borders on cards; shadow only on floating search, booking summary and dialogs. Images reserve aspect ratio. Feedback stays within fixed toast region.
## Shapes
12px controls, 16px cards. Hero image uses 24px. Round icon wells and the Q mark are intentional exceptions.
## Components
Buttons: solid primary, outlined neutral, text links. Minimum 46px height. Shared icons are 24px line SVG; adjacent text labels remain. Forms use shared field() builder, native selects and date inputs (OS popup ownership accepted), explicit labels, inline errors. Browser dialog provides focus containment and inert background; least destructive action gets focus on cancellation confirmation. Search skeletons mirror card geometry. Workspace lists use explicit pagination. Global toast is a polite live region. Motion 160ms; reduced motion disables it. Never animate layout or add invented reviews.
## Do's and Don'ts
- Use the same clinic card, booking controls and validation everywhere.
- RU and KZ copy switches together; Kazakh needs native editorial review before pilot.
- Use neutral image placeholders until verified clinic photos exist; no fictitious public cards or ratings.
- Never display real contact details, legal approval or integration status without verified configuration.
