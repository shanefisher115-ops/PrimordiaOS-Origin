# Design Tokens

MoneyPlugHub OS uses a three-tier token architecture processed by [Style Dictionary](https://amzn.github.io/style-dictionary). Tokens live in `tokens/` as JSON, are built into CSS and platform-specific outputs by `pnpm build:tokens`, and are consumed in components exclusively via CSS custom properties or Tailwind v4 utility classes.

---

## Architecture

```
tokens/                         ← source of truth (JSON)
├── primitive/                  ← raw, context-free values
│   ├── color.json
│   ├── radius.json
│   ├── spacing.json
│   ├── font-size.json
│   └── shadow.json
├── semantic/                   ← purpose-driven aliases
│   ├── color.json
│   ├── radius.json
│   ├── spacing.json
│   ├── typography.json
│   └── shadow.json
└── component/                  ← component-scoped tokens
    ├── button.json
    ├── card.json
    ├── progress-bar.json
    └── badge.json
```

**Rule:** Components reference semantic or component tokens only. Primitive tokens are never used directly in UI code.

---

## Build

```bash
pnpm build:tokens          # one-shot build
pnpm build:tokens:watch    # rebuild on file change
```

### Outputs

| File | Purpose |
|---|---|
| `src/styles/theme.css` | CSS custom properties (`:root { --primitive-* ... }`) |
| `src/styles/tailwind.css` | Tailwind v4 `@theme {}` block |
| `build/js/tokens.js` | ES6 named exports for JS consumers |
| `build/ios/tokens.h` | Objective-C macros |
| `build/android/tokens.xml` | Android XML resources |

---

## Primitive Tokens

### Color

| Token | Value | Usage |
|---|---|---|
| `primitive.color.black-900` | `#050608` | Page background |
| `primitive.color.black-800` | `#0B0F14` | Card surfaces |
| `primitive.color.green-neon` | `#39FF14` | Primary accent |
| `primitive.color.green-soft` | `#2ECC71` | Secondary accent / success deltas |
| `primitive.color.white` | `#FFFFFF` | Primary text |
| `primitive.color.gray-400` | `#A0A8B8` | Secondary text / labels |
| `primitive.color.gray-700` | `#1A1F2A` | Borders / dividers |
| `primitive.color.green-success` | `#22C55E` | Success states |

### Radius

| Token | Value | Tailwind class |
|---|---|---|
| `primitive.radius.xs` | `4px` | — |
| `primitive.radius.sm` | `8px` | — |
| `primitive.radius.md` | `12px` | — |
| `primitive.radius.lg` | `16px` | — |
| `primitive.radius.xl` | `24px` | — |
| `primitive.radius.full` | `999px` | — |

### Spacing

| Token | Value |
|---|---|
| `primitive.spacing.xxs` | `4px` |
| `primitive.spacing.xs` | `8px` |
| `primitive.spacing.sm` | `12px` |
| `primitive.spacing.md` | `16px` |
| `primitive.spacing.lg` | `24px` |
| `primitive.spacing.xl` | `32px` |

### Font Size

| Token | Value |
|---|---|
| `primitive.font-size.xs` | `12px` |
| `primitive.font-size.sm` | `14px` |
| `primitive.font-size.md` | `16px` |
| `primitive.font-size.lg` | `18px` |
| `primitive.font-size.xl` | `24px` |
| `primitive.font-size.xxl` | `28px` |

### Shadow

| Token | Value |
|---|---|
| `primitive.shadow.glow` | `0px 0px 24px rgba(57,255,20,0.35)` |
| `primitive.shadow.card` | `0px 12px 32px rgba(0,255,120,0.18)` |

---

## Semantic Tokens

Semantic tokens name _intent_, not value. Changing a primitive propagates to every semantic alias that references it.

### Color

| Token | Alias | CSS variable |
|---|---|---|
| `semantic.color.background-primary` | `primitive.color.black-900` | `--semantic-color-background-primary` |
| `semantic.color.background-card` | `primitive.color.black-800` | `--semantic-color-background-card` |
| `semantic.color.text-primary` | `primitive.color.white` | `--semantic-color-text-primary` |
| `semantic.color.text-secondary` | `primitive.color.gray-400` | `--semantic-color-text-secondary` |
| `semantic.color.border-subtle` | `primitive.color.gray-700` | `--semantic-color-border-subtle` |
| `semantic.color.accent-primary` | `primitive.color.green-neon` | `--semantic-color-accent-primary` |
| `semantic.color.accent-secondary` | `primitive.color.green-soft` | `--semantic-color-accent-secondary` |
| `semantic.color.success` | `primitive.color.green-success` | `--semantic-color-success` |

### Radius

| Token | Alias | CSS variable |
|---|---|---|
| `semantic.radius.card` | `primitive.radius.lg` | `--semantic-radius-card` |
| `semantic.radius.button` | `primitive.radius.full` | `--semantic-radius-button` |
| `semantic.radius.input` | `primitive.radius.md` | `--semantic-radius-input` |

### Spacing

| Token | Alias | CSS variable | Tailwind |
|---|---|---|---|
| `semantic.spacing.layout-padding` | `primitive.spacing.md` | `--semantic-spacing-layout-padding` | `p-layout` / `px-layout` |
| `semantic.spacing.section-gap` | `primitive.spacing.lg` | `--semantic-spacing-section-gap` | `gap-section` |
| `semantic.spacing.stack-gap` | `primitive.spacing.sm` | `--semantic-spacing-stack-gap` | `gap-stack` |

---

## Component Tokens

| Component | Property | References |
|---|---|---|
| `button-primary` | `background` | `semantic.color.accent-primary` |
| `button-primary` | `text-color` | `semantic.color.text-primary` |
| `button-primary` | `radius` | `semantic.radius.button` |
| `button-primary` | `shadow` | `semantic.shadow.glow` |
| `button-secondary` | `border-color` | `semantic.color.accent-primary` |
| `button-secondary` | `text-color` | `semantic.color.accent-primary` |
| `button-secondary` | `radius` | `semantic.radius.button` |
| `card-primary` | `background` | `semantic.color.background-card` |
| `card-primary` | `radius` | `semantic.radius.card` |
| `card-primary` | `shadow` | `semantic.shadow.card` |
| `card-primary` | `border-color` | `semantic.color.border-subtle` |
| `progress-bar` | `track-color` | `semantic.color.border-subtle` |
| `progress-bar` | `fill-color` | `semantic.color.accent-primary` |
| `badge` | `background` | `semantic.color.background-card` |
| `badge` | `icon-color` | `semantic.color.accent-primary` |

---

## Tailwind v4 Utilities

After running `pnpm build:tokens`, these classes are available:

```html
<!-- Colors -->
<div class="bg-bg-primary">          <!-- #050608 -->
<div class="bg-bg-card">             <!-- #0B0F14 -->
<div class="text-text-primary">      <!-- #FFFFFF -->
<div class="text-text-secondary">    <!-- #A0A8B8 -->
<div class="text-accent-primary">    <!-- #39FF14 -->
<div class="bg-accent-primary">      <!-- #39FF14 -->

<!-- Radius -->
<div class="rounded-card">           <!-- 16px -->
<button class="rounded-button">      <!-- 999px -->
<input class="rounded-input">        <!-- 12px -->

<!-- Spacing -->
<div class="px-layout gap-section">  <!-- 16px / 24px -->
<div class="gap-stack">              <!-- 12px -->

<!-- Shadows -->
<div class="shadow-card">
<div class="shadow-glow">

<!-- Typography -->
<h1 class="text-display">            <!-- 28px -->
<h2 class="text-title">              <!-- 24px -->
<p  class="text-body">               <!-- 14px -->
<span class="text-caption">          <!-- 12px -->
```

---

## Adding a New Token

1. Add the primitive value to the relevant file in `tokens/primitive/`.
2. Create a semantic alias in `tokens/semantic/`.
3. Reference it in `tokens/component/` if it is component-scoped.
4. Run `pnpm build:tokens` to regenerate all platform outputs.
5. Use `var(--semantic-*)` in inline styles or the generated Tailwind class in JSX.

---

## CSS Variable Reference

All generated CSS variables follow this naming convention:

```
--{tier}-{category}-{name}
```

Examples:
- `--primitive-color-green-neon`
- `--semantic-color-accent-primary`
- `--semantic-radius-button`
- `--component-button-primary-background`

Import `src/styles/theme.css` for the full reference (auto-generated, do not edit).
