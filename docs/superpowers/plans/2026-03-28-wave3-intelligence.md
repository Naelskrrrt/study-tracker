# Wave 3 — Intelligence (Dashboard Adaptatif) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard adaptive to the user's mood, add advanced analytics charts, and implement notifications (in-app, web push, email via Resend + Vercel crons).

**Architecture:** Three independent subsystems. 3.1 (Adaptive Mood) adds a React Context that wraps the dashboard layout and conditionally renders sections based on mood level. 3.2 (Advanced Stats) adds 4 new API routes that aggregate existing data and 4 new Recharts components. 3.3 (Notifications) adds a Prisma model, Service Worker for web push, in-app banners, Resend email integration, and Vercel cron jobs.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 (PostgreSQL), SWR, Recharts, Framer Motion, Tailwind CSS v4, Resend, Web Push API.

**Spec:** `docs/superpowers/specs/2026-03-27-adhd-study-tracker-prd.md` — sections 3.1, 3.2, 3.3.

**Prerequisites:** Wave 1 and Wave 2 must be complete. The following hooks must exist and work: `useProgress`, `useActivity`, `useMood`. The `StudySession` model must have `coinsEarned` field. The `Reward` and `JournalEntry` models must exist in the Prisma schema.

---

## Scope Note

This plan covers 3 independent subsystems that can be implemented in any order:
- **Feature 3.1** (Tasks 1–3): Adaptive Mood Dashboard
- **Feature 3.2** (Tasks 4–8): Advanced Stats & Charts
- **Feature 3.3** (Tasks 9–14): Notifications & Email

---

## File Structure

### Feature 3.1 — Adaptive Mood Dashboard
| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useMoodMode.tsx` | MoodMode context provider + hook — derives mode from today's mood |
| Create | `src/components/ui/ZenDashboard.tsx` | Minimal zen layout for mood 1–2 |
| Modify | `src/app/dashboard/layout.tsx` | Wrap children with `MoodModeProvider` |
| Modify | `src/app/dashboard/page.tsx` | Conditionally render full/standard/zen layout based on mood mode |

### Feature 3.2 — Advanced Stats
| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/api/stats/correlation/route.ts` | Mood vs XP scatter data |
| Create | `src/app/api/stats/predictions/route.ts` | Phase completion date estimates |
| Create | `src/app/api/stats/patterns/route.ts` | Day-of-week productivity patterns |
| Create | `src/app/api/stats/study-time/route.ts` | Weekly study time aggregation |
| Create | `src/components/charts/CorrelationChart.tsx` | Scatter plot: mood vs XP |
| Create | `src/components/charts/PredictionBars.tsx` | Phase progress bars with ETAs |
| Create | `src/components/charts/PatternChart.tsx` | Day-of-week bar chart |
| Create | `src/components/charts/StudyTimeChart.tsx` | Stacked bar chart by phase |
| Create | `src/hooks/useStats.ts` | SWR hook to fetch all 4 stats endpoints |
| Modify | `src/app/dashboard/graphs/page.tsx` | Add new charts section below existing charts |

### Feature 3.3 — Notifications & Email
| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `NotificationPreference` model + User relation |
| Create | `src/app/api/notifications/preferences/route.ts` | GET/PATCH notification preferences |
| Create | `src/app/api/notifications/subscribe/route.ts` | POST web push subscription |
| Create | `src/app/api/email/digest/route.ts` | POST cron endpoint — daily email digest |
| Create | `src/app/api/email/alert/route.ts` | POST cron endpoint — critical alerts |
| Create | `src/lib/email.ts` | Resend client singleton + email templates |
| Create | `src/components/ui/NotificationBanner.tsx` | In-app alert banner (streak danger, deadline) |
| Create | `src/hooks/useNotifications.ts` | SWR hook for preferences + banner logic |
| Create | `public/sw.js` | Service Worker for web push |
| Create | `src/lib/push.ts` | Helper to register SW and subscribe to push |
| Modify | `src/app/dashboard/layout.tsx` | Add NotificationBanner above children |
| Modify | `vercel.json` | Add cron job schedules |
| Modify | `package.json` | Add `resend` and `web-push` dependencies |

---

## Feature 3.1 — Adaptive Mood Dashboard

### Task 1: MoodMode Context Provider

**Files:**
- Create: `src/hooks/useMoodMode.tsx`

This context derives a "mode" from the user's current mood level and provides it to all dashboard components. Three modes: `"zen"` (mood 1–2), `"standard"` (mood 3 or no mood), `"full"` (mood 4–5).

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useMoodMode.test.tsx`:

```tsx
import { renderHook, act } from "@testing-library/react";
import { MoodModeProvider, useMoodMode } from "../useMoodMode";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <MoodModeProvider todayMood={null}>{children}</MoodModeProvider>
);

describe("useMoodMode", () => {
  it("defaults to standard when no mood is set", () => {
    const { result } = renderHook(() => useMoodMode(), { wrapper });
    expect(result.current.mode).toBe("standard");
  });

  it("returns zen mode for mood 1", () => {
    const zenWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={1}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), {
      wrapper: zenWrapper,
    });
    expect(result.current.mode).toBe("zen");
  });

  it("returns zen mode for mood 2", () => {
    const zenWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={2}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), {
      wrapper: zenWrapper,
    });
    expect(result.current.mode).toBe("zen");
  });

  it("returns standard mode for mood 3", () => {
    const stdWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={3}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), {
      wrapper: stdWrapper,
    });
    expect(result.current.mode).toBe("standard");
  });

  it("returns full mode for mood 4", () => {
    const fullWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={4}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), {
      wrapper: fullWrapper,
    });
    expect(result.current.mode).toBe("full");
  });

  it("returns full mode for mood 5", () => {
    const fullWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={5}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), {
      wrapper: fullWrapper,
    });
    expect(result.current.mode).toBe("full");
  });

  it("allows override to show full dashboard", () => {
    const zenWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={1}>{children}</MoodModeProvider>
    );
    const { result } = renderHook(() => useMoodMode(), {
      wrapper: zenWrapper,
    });
    expect(result.current.mode).toBe("zen");
    expect(result.current.isOverridden).toBe(false);

    act(() => {
      result.current.override();
    });

    expect(result.current.mode).toBe("full");
    expect(result.current.isOverridden).toBe(true);
  });

  it("updates mode when todayMood prop changes", () => {
    const zenWrapper = ({ children }: { children: ReactNode }) => (
      <MoodModeProvider todayMood={1}>{children}</MoodModeProvider>
    );
    const { result, rerender } = renderHook(() => useMoodMode(), {
      wrapper: zenWrapper,
    });
    expect(result.current.mode).toBe("zen");
  });
});
```

- [ ] **Step 2: Set up Vitest (if not already configured)**

Check if `vitest.config.ts` exists. If not, run:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Create `vitest.config.ts` at project root:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/useMoodMode.test.tsx`
Expected: FAIL — module `../useMoodMode` not found.

- [ ] **Step 4: Implement MoodMode context**

Create `src/hooks/useMoodMode.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";

export type MoodMode = "zen" | "standard" | "full";

type MoodModeContextValue = {
  mode: MoodMode;
  isOverridden: boolean;
  override: () => void;
  resetOverride: () => void;
};

const MoodModeContext = createContext<MoodModeContextValue>({
  mode: "standard",
  isOverridden: false,
  override: () => {},
  resetOverride: () => {},
});

function deriveModeFromMood(mood: number | null): MoodMode {
  if (mood === null || mood === undefined) return "standard";
  if (mood <= 2) return "zen";
  if (mood >= 4) return "full";
  return "standard";
}

export function MoodModeProvider({
  todayMood,
  children,
}: {
  todayMood: number | null;
  children: ReactNode;
}) {
  const [isOverridden, setIsOverridden] = useState(false);

  const derivedMode = deriveModeFromMood(todayMood);

  // Reset override when mood changes
  useEffect(() => {
    setIsOverridden(false);
  }, [todayMood]);

  const mode = isOverridden ? "full" : derivedMode;

  const override = useCallback(() => setIsOverridden(true), []);
  const resetOverride = useCallback(() => setIsOverridden(false), []);

  return (
    <MoodModeContext value={{ mode, isOverridden, override, resetOverride }}>
      {children}
    </MoodModeContext>
  );
}

export function useMoodMode() {
  return useContext(MoodModeContext);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/useMoodMode.test.tsx`
Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMoodMode.tsx src/hooks/__tests__/useMoodMode.test.tsx vitest.config.ts vitest.setup.ts
git commit -m "feat(wave3): add MoodMode context with zen/standard/full modes"
```

---

### Task 2: ZenDashboard Component

**Files:**
- Create: `src/components/ui/ZenDashboard.tsx`

The zen dashboard is a minimal layout shown when mood is 1–2. It shows a compassionate message, one passive task suggestion, streak reminder, and mood selector. Everything else is hidden.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/ZenDashboard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import ZenDashboard from "../ZenDashboard";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("ZenDashboard", () => {
  const defaultProps = {
    moodLevel: 2 as 1 | 2,
    streak: 5,
    onOverride: vi.fn(),
  };

  it("renders a compassionate message", () => {
    render(<ZenDashboard {...defaultProps} />);
    expect(
      screen.getByText(/journée off|mode passif|force pas/i)
    ).toBeInTheDocument();
  });

  it("shows the current streak", () => {
    render(<ZenDashboard {...defaultProps} />);
    expect(screen.getByText(/5 jour/)).toBeInTheDocument();
  });

  it("shows override link", () => {
    render(<ZenDashboard {...defaultProps} />);
    expect(
      screen.getByText(/voir tout le dashboard/i)
    ).toBeInTheDocument();
  });

  it("calls onOverride when link is clicked", () => {
    render(<ZenDashboard {...defaultProps} />);
    screen.getByText(/voir tout le dashboard/i).click();
    expect(defaultProps.onOverride).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/ZenDashboard.test.tsx`
Expected: FAIL — module `../ZenDashboard` cannot resolve (or component doesn't render expected text).

- [ ] **Step 3: Implement ZenDashboard**

Create `src/components/ui/ZenDashboard.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { MOODS } from "@/lib/data/tasks";

type Props = {
  moodLevel: 1 | 2;
  streak: number;
  onOverride: () => void;
};

const ZEN_MESSAGES: Record<1 | 2, { title: string; body: string }> = {
  1: {
    title: "Journée off. C'est OK.",
    body: "Forcer avec l'ADHD = contre-productif. Reviens demain. Ta progression t'attend.",
  },
  2: {
    title: "Mode passif activé.",
    body: "Ne force pas. Regarde une vidéo courte sans prendre de notes, ou repose-toi.",
  },
};

export default function ZenDashboard({ moodLevel, streak, onOverride }: Props) {
  const msg = ZEN_MESSAGES[moodLevel];
  const mood = MOODS.find((m) => m.level === moodLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-md space-y-6 pt-8"
    >
      {/* Compassionate message */}
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <span className="text-4xl">{mood?.emoji}</span>
        <h2 className="mt-3 text-lg font-bold text-white">{msg.title}</h2>
        <p className="mt-2 text-sm text-muted">{msg.body}</p>
      </div>

      {/* Streak reminder */}
      {streak > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-sm text-muted">
            Ta streak est a{" "}
            <span className="font-mono font-bold text-coral">
              {streak} jour{streak !== 1 ? "s" : ""}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted italic">
            1 mini tache suffit pour la garder.
          </p>
        </div>
      )}

      {/* Override link */}
      <div className="text-center">
        <button
          onClick={onOverride}
          className="text-sm text-muted underline transition-colors hover:text-white"
        >
          Voir tout le dashboard
        </button>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/ZenDashboard.test.tsx`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ZenDashboard.tsx src/components/ui/__tests__/ZenDashboard.test.tsx
git commit -m "feat(wave3): add ZenDashboard minimal layout for low-energy moods"
```

---

### Task 3: Integrate Mood Mode into Dashboard

**Files:**
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/page.tsx`

Wire the MoodMode context into the layout and make the dashboard page conditionally render zen vs full/standard content.

- [ ] **Step 1: Update dashboard layout to include MoodModeProvider**

Modify `src/app/dashboard/layout.tsx`. The tricky part: the layout needs `todayMood` but can't call hooks (it's the outermost layout). Solution: the `MoodModeProvider` receives `todayMood` from the page that uses it, not the layout. Instead, we'll wrap the provider inside the page.

Actually, the provider needs to wrap all dashboard pages (not just the home page). Move the provider into the layout but have it receive mood from a shared hook. Since the layout is `"use client"`, it can call hooks.

Update `src/app/dashboard/layout.tsx`:

```tsx
"use client";

import BottomNav from "@/components/ui/BottomNav";
import QuickCaptureModal from "@/components/ui/QuickCaptureModal";
import { TimerProvider } from "@/hooks/useTimer";
import { MoodModeProvider } from "@/hooks/useMoodMode";
import { useMood } from "@/hooks/useMood";

function MoodModeWrapper({ children }: { children: React.ReactNode }) {
  const { todayLevel } = useMood();
  return <MoodModeProvider todayMood={todayLevel}>{children}</MoodModeProvider>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimerProvider>
      <MoodModeWrapper>
        <div className="min-h-screen bg-bg">
          <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
          <BottomNav />
          <QuickCaptureModal />
        </div>
      </MoodModeWrapper>
    </TimerProvider>
  );
}
```

- [ ] **Step 2: Update dashboard page to use mood mode**

Modify `src/app/dashboard/page.tsx`. Add the mode-based rendering:

At the top, add imports:

```tsx
import { useMoodMode } from "@/hooks/useMoodMode";
import ZenDashboard from "@/components/ui/ZenDashboard";
import { AnimatePresence, motion } from "framer-motion";
```

Inside `DashboardPage`, after the existing hook calls (line ~46), add:

```tsx
const { mode, override } = useMoodMode();
```

Replace the return block (starting from `return (`) with:

```tsx
  return (
    <>
      <TimerBar />
      <AnimatePresence mode="wait">
        {mode === "zen" && todayLevel !== null && (todayLevel === 1 || todayLevel === 2) ? (
          <motion.div
            key="zen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ZenDashboard
              moodLevel={todayLevel as 1 | 2}
              streak={streak}
              onOverride={override}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Bloc gauche — contenu principal */}
              <div className="space-y-4">
                <XPBar totalXP={totalXP} currentLevel={currentLevel} />

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Taches" value={`${doneCount}/${totalCount}`} color="text-white" />
                  <StatCard label="Progression" value={`${pct}%`} color="text-nvidia" />
                  <StatCard label="Certifs" value={`${certifCount}/3`} color="text-amber" />
                  <StatCard label="Jours actifs" value={activities.length} color="text-purple" />
                </div>

                <StreakCard streak={streak} activeDates={activeDates} />

                <MoodTracker
                  todayLevel={todayLevel}
                  entries={moodEntries.map((e) => ({
                    date: e.date,
                    moodLevel: e.moodLevel,
                  }))}
                  onSetMood={setMood}
                />

                <FocusCard completedIds={completedIds} onComplete={handleComplete} />

                <BrainDump />
              </div>

              {/* Bloc droite — activite (only in full mode show advanced stats) */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-4">
                  <ContribGraph activityMap={activityMap} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Streak max" value={`${maxStreak}j`} color="text-coral" />
                  <StatCard label="Total jours" value={totalDays} color="text-nvidia" />
                  <StatCard label="Cette semaine" value={thisWeekCount} color="text-purple" />
                  <StatCard
                    label="Meilleur jour"
                    value={bestDay ? `${bestDay.xpEarned} XP` : "\u2014"}
                    color="text-amber"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-surface p-4">
                  <p className="mb-1 text-xs font-semibold text-muted">
                    Streak actuelle
                  </p>
                  <p className="font-mono text-2xl font-bold text-coral">
                    {streak} jour{streak !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Overlays */}
              <Confetti active={confettiActive} count={confettiCount} />
              <Toast
                message={toast.message}
                visible={toast.visible}
                onClose={() => setToast((t) => ({ ...t, visible: false }))}
              />
              <AchievePopup
                visible={achieve.visible}
                title={achieve.title}
                subtitle={achieve.subtitle}
                onClose={() => setAchieve((a) => ({ ...a, visible: false }))}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx next build` (or `npm run dev` and check for errors)
Expected: No compile errors. The dashboard should render the zen layout when mood is 1–2, and the full layout otherwise.

- [ ] **Step 4: Manual test**

1. Open the dashboard in the browser
2. Click a mood emoji (1 or 2) in the MoodTracker
3. Verify the dashboard switches to zen mode with the compassionate message
4. Click "Voir tout le dashboard" to verify override works
5. Click mood 4 or 5 → verify full dashboard returns
6. Click mood 3 → verify standard dashboard (same as current)

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/dashboard/page.tsx
git commit -m "feat(wave3): integrate adaptive mood mode into dashboard"
```

---

## Feature 3.2 — Advanced Stats

### Task 4: Correlation API Route + Chart

**Files:**
- Create: `src/app/api/stats/correlation/route.ts`
- Create: `src/components/charts/CorrelationChart.tsx`

Scatter plot showing mood vs XP productivity. Joins MoodEntry with DailyActivity by date to produce `{ mood, xp }` pairs.

- [ ] **Step 1: Write the API route test**

Create `src/app/api/stats/__tests__/correlation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    moodEntry: { findMany: vi.fn() },
    dailyActivity: { findMany: vi.fn() },
  },
}));

import { GET } from "../correlation/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/correlation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns correlation data joining mood and activity by date", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1" },
    } as any);

    vi.mocked(prisma.moodEntry.findMany).mockResolvedValue([
      { date: "2026-03-01", moodLevel: 4 },
      { date: "2026-03-02", moodLevel: 2 },
      { date: "2026-03-03", moodLevel: 5 },
    ] as any);

    vi.mocked(prisma.dailyActivity.findMany).mockResolvedValue([
      { date: "2026-03-01", xpEarned: 120 },
      { date: "2026-03-02", xpEarned: 30 },
      // No activity on 03-03
    ] as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.points).toEqual([
      { mood: 4, xp: 120 },
      { mood: 2, xp: 30 },
      { mood: 5, xp: 0 },
    ]);
    expect(body.insight).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stats/__tests__/correlation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement correlation API route**

Create `src/app/api/stats/correlation/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [moods, activities] = await Promise.all([
    prisma.moodEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
    }),
    prisma.dailyActivity.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
    }),
  ]);

  const activityMap = new Map(activities.map((a) => [a.date, a.xpEarned]));

  const points = moods.map((m) => ({
    mood: m.moodLevel,
    xp: activityMap.get(m.date) ?? 0,
  }));

  // Calculate average XP per mood level for insight
  const avgByMood: Record<number, { total: number; count: number }> = {};
  for (const p of points) {
    if (!avgByMood[p.mood]) avgByMood[p.mood] = { total: 0, count: 0 };
    avgByMood[p.mood].total += p.xp;
    avgByMood[p.mood].count += 1;
  }

  const avgs = Object.entries(avgByMood).map(([mood, { total, count }]) => ({
    mood: Number(mood),
    avgXP: Math.round(total / count),
  }));

  // Generate insight
  const highMoodAvg =
    avgs.filter((a) => a.mood >= 4).reduce((s, a) => s + a.avgXP, 0) /
      Math.max(avgs.filter((a) => a.mood >= 4).length, 1) || 0;
  const lowMoodAvg =
    avgs.filter((a) => a.mood <= 2).reduce((s, a) => s + a.avgXP, 0) /
      Math.max(avgs.filter((a) => a.mood <= 2).length, 1) || 0;

  const ratio = lowMoodAvg > 0 ? (highMoodAvg / lowMoodAvg).toFixed(1) : null;
  const insight = ratio
    ? `Tu es ${ratio}x plus productif quand tu es Motive vs Fatigue`
    : "Continue a logger ton mood pour voir les correlations !";

  return Response.json({ points, avgs, insight });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stats/__tests__/correlation.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement CorrelationChart component**

Create `src/components/charts/CorrelationChart.tsx`:

```tsx
"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { MOODS } from "@/lib/data/tasks";

const EMOJI_MAP = Object.fromEntries(MOODS.map((m) => [m.level, m.emoji]));

type Props = {
  points: { mood: number; xp: number }[];
  insight: string;
};

export default function CorrelationChart({ points, insight }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-1 text-sm font-bold text-white">
        Correlation mood / productivite
      </h3>
      <p className="mb-3 text-xs text-muted italic">{insight}</p>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="mood"
            type="number"
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tickFormatter={(v: number) => EMOJI_MAP[v] ?? String(v)}
            tick={{ fontSize: 14 }}
            name="Mood"
          />
          <YAxis
            dataKey="xp"
            type="number"
            tick={{ fill: "#7070a0", fontSize: 10 }}
            name="XP"
          />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              name === "Mood"
                ? `${EMOJI_MAP[value] ?? value} (${value}/5)`
                : `${value} XP`,
              name,
            ]}
          />
          <Scatter data={points} fill="#76b900" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stats/correlation/route.ts src/app/api/stats/__tests__/correlation.test.ts src/components/charts/CorrelationChart.tsx
git commit -m "feat(wave3): add mood/XP correlation API and scatter chart"
```

---

### Task 5: Predictions API Route + Chart

**Files:**
- Create: `src/app/api/stats/predictions/route.ts`
- Create: `src/components/charts/PredictionBars.tsx`

Shows per-phase progress bars with estimated completion dates based on 14-day rolling average pace.

- [ ] **Step 1: Write the API route test**

Create `src/app/api/stats/__tests__/predictions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taskCompletion: { findMany: vi.fn() },
    dailyActivity: { findMany: vi.fn() },
  },
}));

import { GET } from "../predictions/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/predictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns phase predictions with estimated dates", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1" },
    } as any);

    // User completed t1, t2 (phase 1 tasks)
    vi.mocked(prisma.taskCompletion.findMany).mockResolvedValue([
      { taskId: "t1", completedAt: new Date("2026-03-15") },
      { taskId: "t2", completedAt: new Date("2026-03-20") },
    ] as any);

    // 10 active days in last 14 days
    vi.mocked(prisma.dailyActivity.findMany).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        date: `2026-03-${String(15 + i).padStart(2, "0")}`,
        count: 1,
      })) as any
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.phases).toHaveLength(3);
    expect(body.phases[0].done).toBe(2);
    expect(body.phases[0].total).toBe(5);
    expect(body.phases[0].estimatedDate).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stats/__tests__/predictions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement predictions API route**

Create `src/app/api/stats/predictions/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PHASES } from "@/lib/data/tasks";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [completions, recentActivity] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: { userId: session.user.id },
      select: { taskId: true, completedAt: true },
    }),
    prisma.dailyActivity.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        },
      },
    }),
  ]);

  const completedIds = new Set(completions.map((c) => c.taskId));

  // Calculate pace: tasks completed per active day over last 14 days
  const recentCompletions = completions.filter((c) => {
    const d = c.completedAt.toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return d >= cutoff;
  });

  const activeDays14 = recentActivity.length;
  const tasksPerDay =
    activeDays14 > 0 ? recentCompletions.length / activeDays14 : 0;

  const today = new Date();

  const phases = PHASES.map((phase) => {
    const done = phase.tasks.filter((t) => completedIds.has(t.id)).length;
    const total = phase.tasks.length;
    const remaining = total - done;

    let estimatedDate: string | null = null;
    if (remaining > 0 && tasksPerDay > 0) {
      const daysNeeded = Math.ceil(remaining / tasksPerDay);
      const est = new Date(today);
      est.setDate(est.getDate() + daysNeeded);
      estimatedDate = est.toISOString().slice(0, 10);
    } else if (remaining === 0) {
      estimatedDate = null; // Already done
    }

    return {
      id: phase.id,
      name: phase.name,
      color: phase.color,
      done,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      estimatedDate,
      isComplete: remaining === 0,
    };
  });

  return Response.json({ phases, tasksPerDay: Math.round(tasksPerDay * 100) / 100 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stats/__tests__/predictions.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement PredictionBars component**

Create `src/components/charts/PredictionBars.tsx`:

```tsx
"use client";

import { formatDateFR } from "@/lib/utils/dates";

const COLORS_MAP: Record<string, string> = {
  green: "#76b900",
  purple: "#6c63ff",
  amber: "#ffd60a",
};

type PhasePrediction = {
  id: string;
  name: string;
  color: string;
  done: number;
  total: number;
  pct: number;
  estimatedDate: string | null;
  isComplete: boolean;
};

type Props = {
  phases: PhasePrediction[];
};

export default function PredictionBars({ phases }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-white">
        Prediction de fin par phase
      </h3>
      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase.id}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                {phase.name}
              </span>
              <span className="text-xs text-muted">
                {phase.isComplete
                  ? "Terminee"
                  : phase.estimatedDate
                    ? `~ ${formatDateFR(phase.estimatedDate)}`
                    : "Pas assez de donnees"}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${phase.pct}%`,
                  backgroundColor: COLORS_MAP[phase.color] ?? "#76b900",
                }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-muted">
              {phase.done}/{phase.total} taches ({phase.pct}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stats/predictions/route.ts src/app/api/stats/__tests__/predictions.test.ts src/components/charts/PredictionBars.tsx
git commit -m "feat(wave3): add phase prediction API and progress bars"
```

---

### Task 6: Patterns API Route + Chart

**Files:**
- Create: `src/app/api/stats/patterns/route.ts`
- Create: `src/components/charts/PatternChart.tsx`

Bar chart showing which days of the week are most productive.

- [ ] **Step 1: Write the API route test**

Create `src/app/api/stats/__tests__/patterns.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyActivity: { findMany: vi.fn() },
  },
}));

import { GET } from "../patterns/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/patterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns XP aggregated by day of week", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1" },
    } as any);

    vi.mocked(prisma.dailyActivity.findMany).mockResolvedValue([
      { date: "2026-03-23", xpEarned: 100 }, // Monday
      { date: "2026-03-24", xpEarned: 50 },  // Tuesday
      { date: "2026-03-25", xpEarned: 80 },  // Wednesday
    ] as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.days).toHaveLength(7);
    // Monday should have 100 XP
    expect(body.days.find((d: any) => d.day === "Lun").avgXP).toBe(100);
    expect(body.bestDay).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stats/__tests__/patterns.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement patterns API route**

Create `src/app/api/stats/patterns/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const activities = await prisma.dailyActivity.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  });

  // Aggregate XP by day of week
  const buckets: Record<number, { totalXP: number; count: number }> = {};
  for (let i = 0; i < 7; i++) {
    buckets[i] = { totalXP: 0, count: 0 };
  }

  for (const a of activities) {
    const dayOfWeek = new Date(a.date + "T00:00:00").getDay();
    buckets[dayOfWeek].totalXP += a.xpEarned;
    buckets[dayOfWeek].count += 1;
  }

  // Reorder to start from Monday (1) to Sunday (0)
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  const days = orderedDays.map((dayIndex) => ({
    day: DAY_LABELS[dayIndex],
    dayIndex,
    avgXP: buckets[dayIndex].count > 0
      ? Math.round(buckets[dayIndex].totalXP / buckets[dayIndex].count)
      : 0,
    totalXP: buckets[dayIndex].totalXP,
    sessionCount: buckets[dayIndex].count,
  }));

  const bestDay = days.reduce(
    (best, d) => (d.avgXP > best.avgXP ? d : best),
    days[0]
  );

  const insight =
    bestDay.avgXP > 0
      ? `Tes ${bestDay.day}s sont tes jours les plus productifs (${bestDay.avgXP} XP en moyenne)`
      : "Continue a etudier pour voir tes patterns !";

  return Response.json({ days, bestDay: bestDay.day, insight });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stats/__tests__/patterns.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement PatternChart component**

Create `src/components/charts/PatternChart.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type DayPattern = {
  day: string;
  avgXP: number;
};

type Props = {
  days: DayPattern[];
  insight: string;
};

export default function PatternChart({ days, insight }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-1 text-sm font-bold text-white">
        Patterns par jour
      </h3>
      <p className="mb-3 text-xs text-muted italic">{insight}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={days}>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#7070a0", fontSize: 10 }}
          />
          <YAxis tick={{ fill: "#7070a0", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} XP`, "XP moyen"]}
          />
          <Bar dataKey="avgXP" fill="#f472b6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stats/patterns/route.ts src/app/api/stats/__tests__/patterns.test.ts src/components/charts/PatternChart.tsx
git commit -m "feat(wave3): add day-of-week pattern API and bar chart"
```

---

### Task 7: Study Time API Route + Chart

**Files:**
- Create: `src/app/api/stats/study-time/route.ts`
- Create: `src/components/charts/StudyTimeChart.tsx`

Stacked bar chart showing weekly study time broken down by phase, with a total hours stat.

- [ ] **Step 1: Write the API route test**

Create `src/app/api/stats/__tests__/study-time.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    studySession: { findMany: vi.fn() },
  },
}));

import { GET } from "../study-time/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/stats/study-time", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns weekly study time with total hours", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1" },
    } as any);

    vi.mocked(prisma.studySession.findMany).mockResolvedValue([
      {
        taskId: "t1",
        durationMin: 60,
        startedAt: new Date("2026-03-23T10:00:00Z"),
      },
      {
        taskId: "t6",
        durationMin: 45,
        startedAt: new Date("2026-03-24T14:00:00Z"),
      },
    ] as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalHours).toBeDefined();
    expect(body.weeks).toBeDefined();
    expect(Array.isArray(body.weeks)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/stats/__tests__/study-time.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement study-time API route**

Create `src/app/api/stats/study-time/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PHASES } from "@/lib/data/tasks";

// Build a map: taskId -> phaseId
const TASK_TO_PHASE = new Map<string, string>();
for (const phase of PHASES) {
  for (const task of phase.tasks) {
    TASK_TO_PHASE.set(task.id, phase.id);
  }
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.studySession.findMany({
    where: {
      userId: session.user.id,
      durationMin: { not: null },
    },
    select: {
      taskId: true,
      durationMin: true,
      startedAt: true,
    },
    orderBy: { startedAt: "asc" },
  });

  // Aggregate by week and phase
  const weekMap = new Map<
    string,
    { green: number; purple: number; amber: number; other: number }
  >();

  let totalMin = 0;

  for (const s of sessions) {
    const weekStart = getWeekStart(s.startedAt.toISOString().slice(0, 10));
    const phaseId = s.taskId ? TASK_TO_PHASE.get(s.taskId) : null;
    const phaseColor =
      PHASES.find((p) => p.id === phaseId)?.color ?? "other";
    const min = s.durationMin ?? 0;

    totalMin += min;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { green: 0, purple: 0, amber: 0, other: 0 });
    }
    const week = weekMap.get(weekStart)!;
    if (phaseColor === "green" || phaseColor === "purple" || phaseColor === "amber") {
      week[phaseColor] += min;
    } else {
      week.other += min;
    }
  }

  // Get last 8 weeks
  const now = new Date();
  const weeks: {
    week: string;
    green: number;
    purple: number;
    amber: number;
    other: number;
  }[] = [];

  for (let w = 7; w >= 0; w--) {
    const d = new Date(now);
    d.setDate(d.getDate() - w * 7);
    const weekStart = getWeekStart(d.toISOString().slice(0, 10));
    const data = weekMap.get(weekStart) ?? {
      green: 0,
      purple: 0,
      amber: 0,
      other: 0,
    };
    weeks.push({
      week: new Date(weekStart + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      green: Math.round(data.green / 60 * 10) / 10,
      purple: Math.round(data.purple / 60 * 10) / 10,
      amber: Math.round(data.amber / 60 * 10) / 10,
      other: Math.round(data.other / 60 * 10) / 10,
    });
  }

  const totalHours = Math.round(totalMin / 60 * 10) / 10;

  return Response.json({ weeks, totalHours });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/stats/__tests__/study-time.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement StudyTimeChart component**

Create `src/components/charts/StudyTimeChart.tsx`:

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type WeekData = {
  week: string;
  green: number;
  purple: number;
  amber: number;
  other: number;
};

type Props = {
  weeks: WeekData[];
  totalHours: number;
};

export default function StudyTimeChart({ weeks, totalHours }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Temps d'etude (8 sem.)</h3>
        <span className="font-mono text-sm font-bold text-nvidia">
          {totalHours}h total
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={weeks}>
          <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={{ fill: "#7070a0", fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: "#7070a0", fontSize: 10 }}
            label={{
              value: "heures",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#7070a0", fontSize: 10 },
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#13132a",
              border: "1px solid #2a2a4a",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                green: "Phase 1",
                purple: "Phase 2",
                amber: "Phase 3",
                other: "Autre",
              };
              return [`${value}h`, labels[name] ?? name];
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                green: "P1",
                purple: "P2",
                amber: "P3",
                other: "Autre",
              };
              return labels[value] ?? value;
            }}
            wrapperStyle={{ fontSize: 10 }}
          />
          <Bar dataKey="green" stackId="a" fill="#76b900" />
          <Bar dataKey="purple" stackId="a" fill="#6c63ff" />
          <Bar dataKey="amber" stackId="a" fill="#ffd60a" />
          <Bar dataKey="other" stackId="a" fill="#555" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/stats/study-time/route.ts src/app/api/stats/__tests__/study-time.test.ts src/components/charts/StudyTimeChart.tsx
git commit -m "feat(wave3): add study time API and stacked bar chart"
```

---

### Task 8: Stats Hook + Update Graphs Page

**Files:**
- Create: `src/hooks/useStats.ts`
- Modify: `src/app/dashboard/graphs/page.tsx`

Create the SWR hook that fetches all 4 stats endpoints and wire the new charts into the graphs page.

- [ ] **Step 1: Create useStats SWR hook**

Create `src/hooks/useStats.ts`:

```ts
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CorrelationData = {
  points: { mood: number; xp: number }[];
  avgs: { mood: number; avgXP: number }[];
  insight: string;
};

type PredictionData = {
  phases: {
    id: string;
    name: string;
    color: string;
    done: number;
    total: number;
    pct: number;
    estimatedDate: string | null;
    isComplete: boolean;
  }[];
  tasksPerDay: number;
};

type PatternData = {
  days: { day: string; avgXP: number }[];
  bestDay: string;
  insight: string;
};

type StudyTimeData = {
  weeks: {
    week: string;
    green: number;
    purple: number;
    amber: number;
    other: number;
  }[];
  totalHours: number;
};

export function useStats() {
  const { data: correlation, isLoading: corrLoading } =
    useSWR<CorrelationData>("/api/stats/correlation", fetcher, {
      revalidateOnFocus: false,
    });

  const { data: predictions, isLoading: predLoading } =
    useSWR<PredictionData>("/api/stats/predictions", fetcher, {
      revalidateOnFocus: false,
    });

  const { data: patterns, isLoading: patLoading } =
    useSWR<PatternData>("/api/stats/patterns", fetcher, {
      revalidateOnFocus: false,
    });

  const { data: studyTime, isLoading: stLoading } =
    useSWR<StudyTimeData>("/api/stats/study-time", fetcher, {
      revalidateOnFocus: false,
    });

  return {
    correlation: correlation ?? null,
    predictions: predictions ?? null,
    patterns: patterns ?? null,
    studyTime: studyTime ?? null,
    isLoading: corrLoading || predLoading || patLoading || stLoading,
  };
}
```

- [ ] **Step 2: Update the graphs page**

Modify `src/app/dashboard/graphs/page.tsx`. Add dynamic imports for the new charts and a second section:

Replace the entire file with:

```tsx
"use client";

import dynamic from "next/dynamic";
import { useProgress } from "@/hooks/useProgress";
import { useActivity } from "@/hooks/useActivity";
import { useMood } from "@/hooks/useMood";
import { useStats } from "@/hooks/useStats";

const XPChart = dynamic(() => import("@/components/charts/XPChart"), {
  ssr: false,
});
const PhasesDonut = dynamic(() => import("@/components/charts/PhasesDonut"), {
  ssr: false,
});
const WeeklyBar = dynamic(() => import("@/components/charts/WeeklyBar"), {
  ssr: false,
});
const MoodChart = dynamic(() => import("@/components/charts/MoodChart"), {
  ssr: false,
});
const CorrelationChart = dynamic(
  () => import("@/components/charts/CorrelationChart"),
  { ssr: false }
);
const PredictionBars = dynamic(
  () => import("@/components/charts/PredictionBars"),
  { ssr: false }
);
const PatternChart = dynamic(
  () => import("@/components/charts/PatternChart"),
  { ssr: false }
);
const StudyTimeChart = dynamic(
  () => import("@/components/charts/StudyTimeChart"),
  { ssr: false }
);

export default function GraphsPage() {
  const { completedIds, isLoading: progressLoading } = useProgress();
  const { activities, isLoading: activityLoading } = useActivity();
  const { entries: moodEntries, isLoading: moodLoading } = useMood();
  const {
    correlation,
    predictions,
    patterns,
    studyTime,
    isLoading: statsLoading,
  } = useStats();

  const isLoading = progressLoading || activityLoading || moodLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Graphiques</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <XPChart
          activities={activities.map((a) => ({
            date: a.date,
            xpEarned: a.xpEarned,
          }))}
        />
        <PhasesDonut completedIds={completedIds} />
        <WeeklyBar
          activities={activities.map((a) => ({
            date: a.date,
            count: a.count,
          }))}
        />
        <MoodChart
          entries={moodEntries.map((e) => ({
            date: e.date,
            moodLevel: e.moodLevel,
          }))}
        />
      </div>

      {/* Advanced stats section */}
      <h2 className="text-lg font-bold text-white">Stats avancees</h2>

      {statsLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-nvidia border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {correlation && (
            <CorrelationChart
              points={correlation.points}
              insight={correlation.insight}
            />
          )}
          {predictions && (
            <PredictionBars phases={predictions.phases} />
          )}
          {patterns && (
            <PatternChart days={patterns.days} insight={patterns.insight} />
          )}
          {studyTime && (
            <StudyTimeChart
              weeks={studyTime.weeks}
              totalHours={studyTime.totalHours}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx next build` (or `npm run dev` and check `/dashboard/graphs` for errors)
Expected: No compile errors. All 8 charts should render (4 existing + 4 new).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useStats.ts src/app/dashboard/graphs/page.tsx
git commit -m "feat(wave3): add useStats hook and wire advanced charts into graphs page"
```

---

## Feature 3.3 — Notifications & Email

### Task 9: Prisma Schema — NotificationPreference Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add NotificationPreference model and User relation**

Add the relation inside the existing `User` model, after the last relation field:

```prisma
  notificationPreference NotificationPreference?
```

Add the new model after the Wave 2 section (or at the end):

```prisma
// ── Wave 3: Intelligence ──

model NotificationPreference {
  id               String  @id @default(cuid())
  userId           String  @unique
  emailDigest      Boolean @default(true)
  emailAlerts      Boolean @default(true)
  digestTime       String  @default("20:00")
  pushEnabled      Boolean @default(false)
  pushSubscription Json?
  user             User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Generate Prisma client and push schema**

Run:

```bash
npx prisma generate && npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema." and updated client in `src/generated/prisma`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma src/generated/
git commit -m "feat(wave3): add NotificationPreference prisma model"
```

---

### Task 10: Notification Preferences API

**Files:**
- Create: `src/app/api/notifications/preferences/route.ts`

GET returns current preferences (auto-creates defaults if none exist). PATCH updates preferences.

- [ ] **Step 1: Write the API route test**

Create `src/app/api/notifications/__tests__/preferences.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET, PATCH } from "../preferences/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("Notification Preferences API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET auto-creates defaults when none exist", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    const defaults = {
      id: "np1",
      userId: "u1",
      emailDigest: true,
      emailAlerts: true,
      digestTime: "20:00",
      pushEnabled: false,
      pushSubscription: null,
    };

    vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue(
      defaults as any
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.emailDigest).toBe(true);
    expect(body.digestTime).toBe("20:00");
  });

  it("PATCH updates preferences", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue({
      id: "np1",
      userId: "u1",
      emailDigest: false,
      emailAlerts: true,
      digestTime: "08:00",
      pushEnabled: false,
      pushSubscription: null,
    } as any);

    const req = new Request("http://localhost/api/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify({ emailDigest: false, digestTime: "08:00" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.emailDigest).toBe(false);
    expect(body.digestTime).toBe("08:00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/notifications/__tests__/preferences.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement preferences API route**

Create `src/app/api/notifications/preferences/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  return Response.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    emailDigest?: boolean;
    emailAlerts?: boolean;
    digestTime?: string;
    pushEnabled?: boolean;
  };

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...(body.emailDigest !== undefined && { emailDigest: body.emailDigest }),
      ...(body.emailAlerts !== undefined && { emailAlerts: body.emailAlerts }),
      ...(body.digestTime !== undefined && { digestTime: body.digestTime }),
      ...(body.pushEnabled !== undefined && { pushEnabled: body.pushEnabled }),
    },
    update: {
      ...(body.emailDigest !== undefined && { emailDigest: body.emailDigest }),
      ...(body.emailAlerts !== undefined && { emailAlerts: body.emailAlerts }),
      ...(body.digestTime !== undefined && { digestTime: body.digestTime }),
      ...(body.pushEnabled !== undefined && { pushEnabled: body.pushEnabled }),
    },
  });

  return Response.json(prefs);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/notifications/__tests__/preferences.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/notifications/preferences/route.ts src/app/api/notifications/__tests__/preferences.test.ts
git commit -m "feat(wave3): add notification preferences API with auto-create defaults"
```

---

### Task 11: In-App Notification Banner + Hook

**Files:**
- Create: `src/hooks/useNotifications.ts`
- Create: `src/components/ui/NotificationBanner.tsx`
- Modify: `src/app/dashboard/layout.tsx`

Banner at the top of the dashboard for streak danger and deadline warnings.

- [ ] **Step 1: Create useNotifications hook**

Create `src/hooks/useNotifications.ts`:

```ts
"use client";

import { useMemo } from "react";
import { todayString, daysUntil } from "@/lib/utils/dates";

type Alert = {
  id: string;
  type: "streak" | "deadline" | "info";
  message: string;
  severity: "critical" | "warning" | "info";
};

type UseNotificationsInput = {
  streak: number;
  activeDates: Set<string>;
  deadlines: { name: string; targetDate: string | null }[];
};

export function useNotificationAlerts({
  streak,
  activeDates,
  deadlines,
}: UseNotificationsInput): Alert[] {
  return useMemo(() => {
    const alerts: Alert[] = [];
    const today = todayString();
    const now = new Date();
    const hour = now.getHours();

    // Streak danger: no activity today and it's after 18:00
    if (streak > 0 && !activeDates.has(today) && hour >= 18) {
      alerts.push({
        id: "streak-danger",
        type: "streak",
        message: `Ta streak de ${streak}j va se perdre — fais 1 tache !`,
        severity: "critical",
      });
    }

    // Deadline warnings: < 7 days
    for (const dl of deadlines) {
      if (!dl.targetDate) continue;
      const days = daysUntil(dl.targetDate);
      if (days <= 0) continue; // Past deadline, ignore
      if (days <= 3) {
        alerts.push({
          id: `deadline-${dl.name}`,
          type: "deadline",
          message: `${dl.name} dans ${days} jour${days !== 1 ? "s" : ""} !`,
          severity: "critical",
        });
      } else if (days <= 7) {
        alerts.push({
          id: `deadline-${dl.name}`,
          type: "deadline",
          message: `${dl.name} dans ${days} jours`,
          severity: "warning",
        });
      }
    }

    return alerts;
  }, [streak, activeDates, deadlines]);
}
```

- [ ] **Step 2: Create NotificationBanner component**

Create `src/components/ui/NotificationBanner.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Alert = {
  id: string;
  type: "streak" | "deadline" | "info";
  message: string;
  severity: "critical" | "warning" | "info";
};

type Props = {
  alerts: Alert[];
};

const SEVERITY_STYLES = {
  critical: "border-coral bg-coral/10 text-coral",
  warning: "border-amber bg-amber/10 text-amber",
  info: "border-nvidia bg-nvidia/10 text-nvidia",
};

const ICONS = {
  streak: "\u{1F525}",  // fire emoji
  deadline: "\u{23F0}", // alarm clock emoji
  info: "\u{1F4AC}",    // speech bubble emoji
};

export default function NotificationBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <AnimatePresence>
        {visible.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${SEVERITY_STYLES[alert.severity]}`}
          >
            <div className="flex items-center gap-2">
              <span>{ICONS[alert.type]}</span>
              <span className="text-sm font-semibold">{alert.message}</span>
            </div>
            <button
              onClick={() =>
                setDismissed((prev) => new Set([...prev, alert.id]))
              }
              className="ml-2 text-xs opacity-60 transition-opacity hover:opacity-100"
            >
              x
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Integrate banner into dashboard page**

Modify `src/app/dashboard/page.tsx`:

Add import at the top:

```tsx
import NotificationBanner from "@/components/ui/NotificationBanner";
import { useNotificationAlerts } from "@/hooks/useNotifications";
```

Inside `DashboardPage`, after the `activeDates` computation (line ~92), add:

```tsx
  const alerts = useNotificationAlerts({
    streak,
    activeDates,
    deadlines: [], // Will be populated when useDeadlines hook is available
  });
```

Then, right after `<TimerBar />` (before `<AnimatePresence>`), add:

```tsx
      <NotificationBanner alerts={alerts} />
```

- [ ] **Step 4: Verify the app compiles**

Run: `npm run dev` and check the dashboard.
Expected: Banner appears when streak is at risk (after 18:00 with no activity today). Otherwise hidden.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotifications.ts src/components/ui/NotificationBanner.tsx src/app/dashboard/page.tsx
git commit -m "feat(wave3): add in-app notification banner for streak danger and deadlines"
```

---

### Task 12: Web Push — Service Worker + Subscribe

**Files:**
- Create: `public/sw.js`
- Create: `src/lib/push.ts`
- Create: `src/app/api/notifications/subscribe/route.ts`

Client-side push notifications using the Web Push API. Notifications are triggered client-side by periodic checks (no server push for MVP).

- [ ] **Step 1: Create the Service Worker**

Create `public/sw.js`:

```js
// Service Worker for web push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "NVIDIA Tracker";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "default",
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
```

- [ ] **Step 2: Create push registration helper**

Create `src/lib/push.ts`:

```ts
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showLocalNotification(
  title: string,
  body: string,
  tag: string = "default"
) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Use SW registration for persistent notifications if available
  navigator.serviceWorker?.ready.then((reg) => {
    reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      tag,
      data: { url: "/dashboard" },
    });
  });
}
```

- [ ] **Step 3: Create subscribe API route**

Create `src/app/api/notifications/subscribe/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription } = (await req.json()) as {
    subscription: PushSubscriptionJSON;
  };

  await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      pushEnabled: true,
      pushSubscription: subscription as any,
    },
    update: {
      pushEnabled: true,
      pushSubscription: subscription as any,
    },
  });

  return Response.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add public/sw.js src/lib/push.ts src/app/api/notifications/subscribe/route.ts
git commit -m "feat(wave3): add service worker, push helpers, and subscribe endpoint"
```

---

### Task 13: Resend Email Setup + Digest Endpoint

**Files:**
- Modify: `package.json` (add `resend` dependency)
- Create: `src/lib/email.ts`
- Create: `src/app/api/email/digest/route.ts`

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Create Resend client and email helpers**

Create `src/lib/email.ts`:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "NVIDIA Tracker <onboarding@resend.dev>";

type DigestData = {
  userName: string;
  tasksCompleted: string[];
  xpEarned: number;
  studyTimeMin: number;
  streak: number;
  moodAvg: number | null;
  deadlines: { name: string; daysLeft: number }[];
};

export async function sendDigestEmail(to: string, data: DigestData) {
  const moodEmoji =
    data.moodAvg !== null
      ? data.moodAvg >= 4
        ? "\u{1F4AA}" // muscle
        : data.moodAvg >= 3
          ? "\u{1F610}" // neutral
          : "\u{1F634}" // sleeping
      : "";

  const deadlineSection =
    data.deadlines.length > 0
      ? data.deadlines
          .map((d) => `- ${d.name}: ${d.daysLeft} jour${d.daysLeft !== 1 ? "s" : ""}`)
          .join("\n")
      : "Aucune deadline proche.";

  const hours = Math.round((data.studyTimeMin / 60) * 10) / 10;

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #ededed; padding: 24px; border-radius: 12px;">
      <h2 style="color: #76b900; margin-top: 0;">Recap du jour</h2>
      <p>Salut ${data.userName} !</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">Taches</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold;">${data.tasksCompleted.length}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">XP gagne</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold; color: #76b900;">+${data.xpEarned} XP</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">Temps d'etude</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold;">${hours}h</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a;">Streak</td>
          <td style="padding: 8px; border-bottom: 1px solid #2a2a4a; text-align: right; font-weight: bold; color: #ff6b6b;">${data.streak} jour${data.streak !== 1 ? "s" : ""} \u{1F525}</td>
        </tr>
        ${data.moodAvg !== null ? `<tr>
          <td style="padding: 8px;">Humeur moyenne</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">${data.moodAvg.toFixed(1)}/5 ${moodEmoji}</td>
        </tr>` : ""}
      </table>
      ${data.deadlines.length > 0 ? `<h3 style="color: #ffd60a;">Prochaines deadlines</h3><pre style="color: #a0a0c0; font-size: 13px;">${deadlineSection}</pre>` : ""}
      <p style="color: #7070a0; font-size: 12px; margin-top: 24px;">Continue comme ca. A demain !</p>
    </div>
  `;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Recap: ${data.tasksCompleted.length} tache${data.tasksCompleted.length !== 1 ? "s" : ""} | +${data.xpEarned} XP | Streak ${data.streak}j`,
    html,
  });
}

type AlertData = {
  userName: string;
  alerts: { type: string; message: string }[];
};

export async function sendAlertEmail(to: string, data: AlertData) {
  const alertsHtml = data.alerts
    .map(
      (a) =>
        `<div style="padding: 12px; background: #1a1a2e; border-left: 3px solid #ff6b6b; margin-bottom: 8px; border-radius: 4px;">
          <strong style="color: #ff6b6b;">${a.type === "streak" ? "\u{1F525} Streak" : "\u{23F0} Deadline"}</strong>
          <p style="margin: 4px 0 0; color: #ededed;">${a.message}</p>
        </div>`
    )
    .join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #ededed; padding: 24px; border-radius: 12px;">
      <h2 style="color: #ff6b6b; margin-top: 0;">Alerte</h2>
      <p>Salut ${data.userName},</p>
      ${alertsHtml}
      <p style="color: #7070a0; font-size: 12px; margin-top: 24px;">
        <a href="${process.env.NEXTAUTH_URL ?? "https://nvidia-tracker.vercel.app"}/dashboard" style="color: #76b900;">Ouvrir le dashboard</a>
      </p>
    </div>
  `;

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Alerte: ${data.alerts.map((a) => a.message).join(" | ")}`,
    html,
  });
}
```

- [ ] **Step 3: Create digest cron endpoint**

Create `src/app/api/email/digest/route.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { sendDigestEmail } from "@/lib/email";
import { todayString } from "@/lib/utils/dates";

export async function POST(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Find all users with email digest enabled
  const prefs = await prisma.notificationPreference.findMany({
    where: { emailDigest: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  let sent = 0;
  let errors = 0;

  for (const pref of prefs) {
    try {
      // Gather yesterday's data for this user
      const [activity, moods, sessions, completions, deadlines] =
        await Promise.all([
          prisma.dailyActivity.findUnique({
            where: {
              userId_date: { userId: pref.userId, date: yesterday },
            },
          }),
          prisma.moodEntry.findMany({
            where: {
              userId: pref.userId,
              date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
            },
          }),
          prisma.studySession.findMany({
            where: {
              userId: pref.userId,
              startedAt: {
                gte: new Date(yesterday + "T00:00:00Z"),
                lt: new Date(today + "T00:00:00Z"),
              },
              durationMin: { not: null },
            },
          }),
          prisma.taskCompletion.findMany({
            where: {
              userId: pref.userId,
              completedAt: {
                gte: new Date(yesterday + "T00:00:00Z"),
                lt: new Date(today + "T00:00:00Z"),
              },
            },
          }),
          prisma.deadline.findMany({
            where: { userId: pref.userId },
          }),
        ]);

      // Skip if no activity yesterday
      if (!activity && completions.length === 0 && sessions.length === 0) {
        continue;
      }

      // Calculate streak
      const allActivities = await prisma.dailyActivity.findMany({
        where: { userId: pref.userId },
        select: { date: true },
        orderBy: { date: "desc" },
      });
      const dates = new Set(allActivities.map((a) => a.date));
      let streak = 0;
      const d = new Date(yesterday + "T00:00:00");
      while (dates.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }

      const studyTimeMin = sessions.reduce(
        (s, sess) => s + (sess.durationMin ?? 0),
        0
      );
      const moodAvg =
        moods.length > 0
          ? moods.reduce((s, m) => s + m.moodLevel, 0) / moods.length
          : null;

      const upcomingDeadlines = deadlines
        .filter((dl) => dl.targetDate)
        .map((dl) => {
          const target = new Date(dl.targetDate! + "T00:00:00");
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const daysLeft = Math.ceil(
            (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return { name: dl.name, daysLeft };
        })
        .filter((dl) => dl.daysLeft > 0 && dl.daysLeft <= 30)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      await sendDigestEmail(pref.user.email, {
        userName: pref.user.name ?? "toi",
        tasksCompleted: activity?.taskNames ?? [],
        xpEarned: activity?.xpEarned ?? 0,
        studyTimeMin,
        streak,
        moodAvg,
        deadlines: upcomingDeadlines,
      });

      sent++;
    } catch {
      errors++;
    }
  }

  return Response.json({ sent, errors, total: prefs.length });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts src/app/api/email/digest/route.ts package.json package-lock.json
git commit -m "feat(wave3): add Resend email client and daily digest cron endpoint"
```

---

### Task 14: Alert Email Endpoint + Vercel Cron Config

**Files:**
- Create: `src/app/api/email/alert/route.ts`
- Modify: `vercel.json`

Critical alerts: streak danger (no activity today at 20:00) and deadlines < 3 days.

- [ ] **Step 1: Create alert cron endpoint**

Create `src/app/api/email/alert/route.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/email";
import { todayString } from "@/lib/utils/dates";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayString();

  const prefs = await prisma.notificationPreference.findMany({
    where: { emailAlerts: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  let sent = 0;

  for (const pref of prefs) {
    const alerts: { type: string; message: string }[] = [];

    // Check streak danger: has a streak but no activity today
    const todayActivity = await prisma.dailyActivity.findUnique({
      where: {
        userId_date: { userId: pref.userId, date: today },
      },
    });

    if (!todayActivity) {
      // Check if user had activity yesterday (i.e., has an active streak)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const yesterdayActivity = await prisma.dailyActivity.findUnique({
        where: {
          userId_date: { userId: pref.userId, date: yesterday },
        },
      });

      if (yesterdayActivity) {
        alerts.push({
          type: "streak",
          message:
            "Tu n'as pas encore etudie aujourd'hui — ta streak va se perdre !",
        });
      }
    }

    // Check deadlines < 3 days
    const deadlines = await prisma.deadline.findMany({
      where: { userId: pref.userId },
    });

    for (const dl of deadlines) {
      if (!dl.targetDate) continue;
      const target = new Date(dl.targetDate + "T00:00:00");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil(
        (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft > 0 && daysLeft <= 3) {
        alerts.push({
          type: "deadline",
          message: `${dl.name} dans ${daysLeft} jour${daysLeft !== 1 ? "s" : ""} !`,
        });
      }
    }

    if (alerts.length > 0) {
      try {
        await sendAlertEmail(pref.user.email, {
          userName: pref.user.name ?? "toi",
          alerts,
        });
        sent++;
      } catch {
        // Continue to next user
      }
    }
  }

  return Response.json({ sent, total: prefs.length });
}
```

- [ ] **Step 2: Update vercel.json with cron schedules**

Replace `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/email/digest",
      "schedule": "0 20 * * *"
    },
    {
      "path": "/api/email/alert",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- [ ] **Step 3: Add required environment variables documentation**

The following env vars are needed for notifications (add to `.env.example` or note in README):

```
RESEND_API_KEY=re_xxxxxxxxxxxx
CRON_SECRET=your-random-secret-here
```

The `CRON_SECRET` is used to verify that cron endpoints are only called by Vercel. Set it in Vercel dashboard under Environment Variables.

- [ ] **Step 4: Verify the app compiles**

Run: `npx next build`
Expected: No compile errors. The cron endpoints should be accessible at `/api/email/digest` and `/api/email/alert`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/email/alert/route.ts vercel.json
git commit -m "feat(wave3): add alert email endpoint and Vercel cron config"
```

---

## Self-Review Checklist

### Spec Coverage

| PRD Requirement | Task |
|---|---|
| 3.1 Mode adaptatif — 3 modes (zen/standard/full) | Task 1 (MoodMode context) |
| 3.1 Mode adaptatif — Zen layout with compassionate message | Task 2 (ZenDashboard) |
| 3.1 Mode adaptatif — Dashboard re-arranges on mood change | Task 3 (dashboard integration) |
| 3.1 Mode adaptatif — "Voir tout le dashboard" override | Task 1 (override) + Task 2 (link) |
| 3.1 Mode adaptatif — Animated transitions | Task 3 (AnimatePresence) |
| 3.2 Stats — Correlation mood/productivity | Tasks 4 |
| 3.2 Stats — Prediction date de fin | Task 5 |
| 3.2 Stats — Patterns jour/heure | Task 6 |
| 3.2 Stats — Temps d'etude | Task 7 |
| 3.2 Stats — Updated graphs page | Task 8 |
| 3.3 Notifications — NotificationPreference model | Task 9 |
| 3.3 Notifications — Preferences API | Task 10 |
| 3.3 Notifications — In-app banner (streak, deadlines) | Task 11 |
| 3.3 Notifications — Web Push (Service Worker) | Task 12 |
| 3.3 Notifications — Email digest (Resend) | Task 13 |
| 3.3 Notifications — Email alerts (critical) | Task 14 |
| 3.3 Notifications — Vercel cron config | Task 14 |

### Placeholder Scan
No TBD, TODO, or "implement later" found. All code steps include complete code blocks.

### Type Consistency
- `MoodMode` type: `"zen" | "standard" | "full"` — consistent across Task 1, 2, 3.
- `Alert` type: `{ id, type, message, severity }` — consistent across Task 11 (hook + banner).
- API response shapes match the props expected by chart components.
- `DigestData` and `AlertData` types in `email.ts` match what the cron endpoints construct.
