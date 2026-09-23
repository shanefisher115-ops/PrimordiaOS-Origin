# Routing

MoneyPlugHub OS currently uses a hand-rolled `useState`-based navigation system. This document describes the current implementation, its limitations, and the recommended migration path to React Router v7.

---

## Current Implementation

Navigation lives entirely in `src/app/App.tsx`. Two pieces of state control what is rendered:

```tsx
const [activeTab, setActiveTab] = useState<BottomTab>("dashboard");
const [screen, setScreen]       = useState<Screen>("dashboard");
```

### Screen Types

```ts
type BottomTab = "dashboard" | "leaderboard" | "quests" | "profile";

type Screen =
  | BottomTab
  | "xp"        // XP Progress (from Dashboard)
  | "badges"    // Badges (from Profile)
  | "referral"  // Referral Engine (from Profile)
  | "ai"        // AI Command Center (from Profile)
  | "settings"; // Settings (from Profile)
```

### Navigation Flow

```
BottomNav tabs (always visible)
├── dashboard  → Dashboard screen
├── quests     → Quests screen
├── leaderboard → Leaderboard screen
└── profile    → Profile hub screen
                  ├── badges    → Badges screen   [back → profile]
                  ├── referral  → Referral screen  [back → profile]
                  ├── ai        → AICommand screen  [back → profile]
                  └── settings  → Settings screen   [back → profile]

Dashboard quick actions
├── quests     → Quests screen   (sets activeTab = "quests")
├── referral   → Referral screen (modal, back → dashboard)
├── ai         → AICommand screen (modal, back → dashboard)
└── badges     → Badges screen   (modal, back → dashboard)

TopBar XP pill → XPProgress screen [back → dashboard]
```

### `onNavigate` / Back

Sub-screens receive an `onNavigate(screen: string)` prop from `App.tsx`. Back behavior is handled by `handleBack()` which always returns to `activeTab` (the last active bottom tab).

---

## Limitations of Current Approach

| Issue | Impact |
|---|---|
| No URL-addressable screens | Cannot deep-link to a specific screen; browser back/forward does not work |
| Single back target | `handleBack()` always returns to `activeTab`, ignoring navigation history |
| No persistent scroll position | Switching tabs resets scroll to top |
| No code splitting | All screens are imported eagerly; bundle grows linearly |
| No transitions | Screen changes are instant; no slide/fade animation between routes |

---

## Recommended Migration: React Router v7

`react-router` v7 is already installed (`"react-router": "7.13.0"` in `package.json`).

### Proposed Route Structure

```
/                    → Dashboard
/quests              → Quests
/leaderboard         → Leaderboard
/profile             → Profile hub
  /profile/badges    → Badges
  /profile/referral  → Referral Engine
  /profile/ai        → AI Command Center
  /profile/settings  → Settings
/xp                  → XP Progress
```

### Migration Steps

#### 1. Wrap the app in `BrowserRouter`

In `__figma__entrypoint__.ts` (or wherever the app mounts):

```tsx
import { BrowserRouter } from "react-router";
import App from "./src/app/App";

export const Code0_8 = () => import('./src/app/App.tsx');
```

Or in `App.tsx` itself if no external wrapper is available.

#### 2. Replace `useState` navigation with `<Routes>`

```tsx
import { Routes, Route, useNavigate, useLocation } from "react-router";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from pathname
  const activeTab = location.pathname.startsWith("/profile") ? "profile"
    : location.pathname.startsWith("/quests") ? "quests"
    : location.pathname.startsWith("/leaderboard") ? "leaderboard"
    : "dashboard";

  return (
    <div className="flex items-center justify-center w-full h-full" style={{ background: "#000" }}>
      <div className="relative flex flex-col overflow-hidden" style={{ width: "min(390px, 100vw)", height: "min(844px, 100vh)" }}>

        <header>
          <TopBar />
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"             element={<Dashboard onNavigate={navigate} />} />
            <Route path="/xp"           element={<XPProgress />} />
            <Route path="/quests"       element={<Quests />} />
            <Route path="/leaderboard"  element={<Leaderboard />} />
            <Route path="/profile"      element={<ProfileHub />} />
            <Route path="/profile/badges"   element={<Badges />} />
            <Route path="/profile/referral" element={<Referral />} />
            <Route path="/profile/ai"       element={<AICommand />} />
            <Route path="/profile/settings" element={<SettingsScreen />} />
          </Routes>
        </main>

        <nav aria-label="Main navigation">
          <BottomNav
            active={activeTab}
            onChange={(tab) => navigate(tab === "dashboard" ? "/" : `/${tab}`)}
          />
        </nav>
      </div>
    </div>
  );
}
```

#### 3. Replace `onNavigate(string)` calls with `useNavigate()`

```tsx
// Before
<button onClick={() => onNavigate("xp")}>View XP</button>

// After (inside component using useNavigate)
const navigate = useNavigate();
<button onClick={() => navigate("/xp")}>View XP</button>
```

#### 4. Replace back button with `useNavigate(-1)`

```tsx
import { useNavigate } from "react-router";
const navigate = useNavigate();

<button onClick={() => navigate(-1)}>
  <ChevronLeft />
</button>
```

#### 5. Add lazy loading for code splitting

```tsx
import { lazy, Suspense } from "react";
import { CardSkeleton } from "./components/Skeleton";

const Dashboard   = lazy(() => import("./components/Dashboard"));
const Leaderboard = lazy(() => import("./components/Leaderboard"));
// ...

<Suspense fallback={<CardSkeleton rows={4} />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    {/* ... */}
  </Routes>
</Suspense>
```

---

## Route Guards (Future)

Once Supabase auth is live, protect routes that require an authenticated user:

```tsx
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <CardSkeleton rows={3} />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

// Usage
<Route path="/profile" element={<RequireAuth><ProfileHub /></RequireAuth>} />
```

---

## Screen Transition Animations

After migrating to React Router, add slide transitions using `motion`:

```tsx
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router";

const location = useLocation();

<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ x: "100%", opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: "-30%", opacity: 0 }}
    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
  >
    <Routes location={location}>
      {/* routes */}
    </Routes>
  </motion.div>
</AnimatePresence>
```

---

## Summary

| | Current | After Migration |
|---|---|---|
| Navigation | `useState` switch | React Router v7 `<Routes>` |
| Deep linking | ❌ | ✅ URL per screen |
| Browser back/forward | ❌ | ✅ |
| Code splitting | ❌ | ✅ `lazy()` per route |
| Transitions | ❌ | ✅ Motion `AnimatePresence` |
| Route guards | N/A | ✅ `RequireAuth` wrapper |
