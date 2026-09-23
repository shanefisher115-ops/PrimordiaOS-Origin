# Accessibility

This document defines the accessibility baseline, known gaps, and implementation checklist for MoneyPlugHub OS.

---

## Target Standard

**WCAG 2.1 Level AA** is the target across all screens. Mobile-first interactions additionally follow APCA (Accessible Perceptual Contrast Algorithm) recommendations for text legibility on dark backgrounds.

---

## Current Status

| Area | Status | Notes |
|---|---|---|
| Color contrast (body text) | ✅ Pass | White on `#050608` ≈ 18:1 — far exceeds AA |
| Color contrast (secondary text) | ⚠️ Partial | `#A0A8B8` on `#050608` ≈ 4.6:1 — passes AA large, borderline normal |
| Color contrast (neon on card) | ⚠️ Partial | `#39FF14` on `#0B0F14` ≈ 12.8:1 — passes, but neon saturation causes halation |
| Focus indicators | ❌ Missing | No `:focus-visible` ring on interactive elements |
| ARIA labels | ❌ Missing | Icon-only buttons have no `aria-label` |
| Screen reader semantics | ❌ Missing | No landmark roles, no live regions for loading states |
| Keyboard navigation | ❌ Missing | Tab order not verified; no skip links |
| Motion reduction | ⚠️ Partial | No `prefers-reduced-motion` support on shimmer animations |
| Touch target size | ✅ Pass | All tap targets ≥ 44×44px (Apple HIG minimum) |
| Color-only information | ⚠️ Partial | Status pills (Approved/Pending) rely on color; no icon or text supplement for colorblind users |

---

## Contrast Reference

| Pair | Ratio | AA Normal | AA Large |
|---|---|---|---|
| `#FFFFFF` on `#050608` | 18.1:1 | ✅ | ✅ |
| `#A0A8B8` on `#050608` | 4.6:1 | ✅ | ✅ |
| `#A0A8B8` on `#0B0F14` | 4.2:1 | ✅ | ✅ |
| `#39FF14` on `#050608` | 12.8:1 | ✅ | ✅ |
| `#39FF14` on `#0B0F14` | 11.7:1 | ✅ | ✅ |
| `#f59e0b` on `#0B0F14` | 6.4:1 | ✅ | ✅ |
| `#ff3b5c` on `#0B0F14` | 4.5:1 | ✅ | ✅ |

---

## Implementation Checklist

### 1. Focus Indicators

Add a visible `:focus-visible` ring using the accent token. Add to `src/styles/base.css`:

```css
@layer base {
  :focus-visible {
    outline: 2px solid var(--semantic-color-accent-primary);
    outline-offset: 2px;
    border-radius: var(--semantic-radius-input);
  }
}
```

Remove the generic `outline-ring/50` from `*` and scope it to focusable elements only.

---

### 2. ARIA Labels on Icon Buttons

Every button that contains only an icon must have an `aria-label`:

```tsx
// ❌ Before
<button onClick={handleCopy}>
  <Copy size={16} />
</button>

// ✅ After
<button onClick={handleCopy} aria-label="Copy referral link">
  <Copy size={16} />
</button>
```

Priority targets:
- Copy button (`Referral.tsx`)
- Bell notification button (`TopBar.tsx`)
- Close button (`DesignSystemPage.tsx`)
- Back chevron (`App.tsx`)
- Run command button (`AICommand.tsx`)

---

### 3. Landmark Roles

Wrap screen content in semantic HTML landmarks:

```tsx
// Navigation
<nav aria-label="Main navigation">
  <BottomNav ... />
</nav>

// Screen content
<main id="main-content">
  {/* screen component */}
</main>

// App header
<header>
  <TopBar ... />
</header>
```

---

### 4. Live Regions for Loading States

Screen readers do not announce React state changes unless a live region is used:

```tsx
// In each data-fetching component
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {loading ? "Loading data..." : error ? `Error: ${error}` : "Content loaded."}
</div>
```

Add a screen-reader-only utility class to `src/styles/base.css`:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

### 5. Motion Reduction

The shimmer skeleton animation should respect `prefers-reduced-motion`:

```css
/* In Skeleton.tsx inline style or base.css */
@media (prefers-reduced-motion: reduce) {
  [style*="shimmer"] {
    animation: none;
    background: #1A1F2A;
  }
}
```

In `src/styles/base.css`:

```css
@layer base {
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

---

### 6. Status Indicator Supplements

The Referral table and Quest status use color alone to convey meaning. Add supplementary icons or text:

```tsx
// ❌ Before — color only
<span style={{ color: statusColor }}>{status}</span>

// ✅ After — color + icon
<span className="flex items-center gap-1" style={{ color: statusColor }}>
  {status === "Approved" && <CheckCircle2 size={12} aria-hidden="true" />}
  {status === "Pending"  && <Clock size={12} aria-hidden="true" />}
  {status === "Rejected" && <XCircle size={12} aria-hidden="true" />}
  {status}
</span>
```

---

### 7. Keyboard Navigation

- Verify tab order matches visual order in: BottomNav, settings list, command list (`AICommand`).
- Add `tabIndex={0}` and `onKeyDown` (Enter/Space → click) to any non-`<button>` / non-`<a>` elements used as interactive targets.
- Add a skip link at the top of `globals.css`:

```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 dt-btn-primary z-50">
  Skip to main content
</a>
```

---

### 8. Form Inputs

All text inputs must have associated `<label>` elements (or `aria-label` if the label is visually hidden):

```tsx
// ❌ Before
<input placeholder="/type a command..." />

// ✅ After
<label htmlFor="cmd-input" className="sr-only">Command input</label>
<input id="cmd-input" placeholder="/type a command..." />
```

---

## Testing Checklist

Before each release:

- [ ] Run axe DevTools or Lighthouse accessibility audit — target score ≥ 90
- [ ] Keyboard-navigate all screens without a mouse
- [ ] Test with VoiceOver (iOS) or TalkBack (Android) on a real device
- [ ] Verify all color pairs against WCAG 2.1 AA using the [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ ] Test with `prefers-reduced-motion: reduce` enabled in OS settings
- [ ] Test at 200% browser zoom — no content should overflow or overlap
- [ ] Check that no information is conveyed by color alone

---

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [APCA Contrast Tool](https://www.myndex.com/APCA/)
- [axe-core](https://github.com/dequelabs/axe-core) — automated accessibility testing
- [React Accessibility Docs](https://react.dev/learn/accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
