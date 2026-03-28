# Wave 2 — Motivation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Coins & Shop reward system, auto-generated Study Journal, and NVIDIA Resources to the ADHD study tracker. This wave closes the motivation loop — users earn coins from study activity, spend them on self-created rewards, and see tangible proof of progress via their journal.

**Architecture:** Same pattern as Wave 1: Prisma model → API route → SWR hook → React component. Coins balance is computed (not stored) by aggregating earnings from sessions, subtasks, streaks, mood logs minus redeemed rewards. Journal entries are auto-generated from daily activity data. Resources are static data enriching `tasks.ts`.

**Tech Stack:** Next.js 16, Prisma 7, SWR, Framer Motion, Tailwind CSS v4, React 19.

**Spec:** `docs/superpowers/specs/2026-03-27-adhd-study-tracker-prd.md` — sections 2.1, 2.2, 2.3.

---

## Task 1: Prisma Schema — Add Wave 2 Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Reward, JournalEntry models and User relations**

Add relations inside the existing `User` model, after the `quickCaptures` field:

```prisma
  rewards         Reward[]
  journalEntries  JournalEntry[]
```

Add new models after the Wave 1 section:

```prisma
// ── Wave 2: Motivation ──

model Reward {
  id          String    @id @default(cuid())
  userId      String
  name        String
  description String?
  cost        Int
  icon        String    @default("gift")
  redeemed    Boolean   @default(false)
  redeemedAt  DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model JournalEntry {
  id        String   @id @default(cuid())
  userId    String
  date      String
  autoData  Json
  notes     String?  @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
}
```

- [ ] **Step 2: Add coinsEarned field to StudySession**

The PRD specifies coins earned per session (1 coin per 15 min). Add to the existing `StudySession` model:

```prisma
  coinsEarned   Int       @default(0)
```

- [ ] **Step 3: Generate Prisma client and push schema**

Run:
```bash
npx prisma generate && npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema." and updated client in `src/generated/prisma`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Reward, JournalEntry models and coinsEarned field (wave 2)"
```

---

## Task 2: Coins Balance & History API

**Files:**
- Create: `src/app/api/coins/balance/route.ts`
- Create: `src/app/api/coins/history/route.ts`

The coin balance is computed by summing all earning sources and subtracting redeemed reward costs.

**Coin sources:**
| Source | Coins | How to query |
|--------|-------|-------------|
| Study sessions (1 per 15 min) | `coinsEarned` field on `StudySession` | Sum `coinsEarned` where `endedAt` is not null |
| Subtask completed | 1 each | Count completed `SubTask` records |
| Task completed | 3 each | Count `TaskCompletion` records × 3 |
| Mood log | 1 each | Count `MoodEntry` records |
| Streak 7 days | 5 | Computed from activity data (client-side bonus) |
| Streak 30 days | 20 | Computed from activity data (client-side bonus) |

For MVP, we compute: sessions coins + subtask count + (task completions × 3) + mood entries - redeemed rewards cost. Streak bonuses are added client-side from the activity hook.

- [ ] **Step 1: Create coins balance route**

Create `src/app/api/coins/balance/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [sessionCoins, subtaskCount, taskCount, moodCount, redeemedCost] =
    await Promise.all([
      // Sum coins from completed study sessions
      prisma.studySession
        .aggregate({
          where: { userId, endedAt: { not: null } },
          _sum: { coinsEarned: true },
        })
        .then((r) => r._sum.coinsEarned ?? 0),
      // Count completed subtasks (1 coin each)
      prisma.subTask.count({ where: { userId, completed: true } }),
      // Count task completions (3 coins each)
      prisma.taskCompletion.count({ where: { userId } }),
      // Count mood entries (1 coin each)
      prisma.moodEntry.count({ where: { userId } }),
      // Sum redeemed reward costs
      prisma.reward
        .aggregate({
          where: { userId, redeemed: true },
          _sum: { cost: true },
        })
        .then((r) => r._sum.cost ?? 0),
    ]);

  const earned = sessionCoins + subtaskCount + taskCount * 3 + moodCount;
  const balance = earned - redeemedCost;

  return Response.json({
    balance,
    earned,
    spent: redeemedCost,
    breakdown: {
      sessions: sessionCoins,
      subtasks: subtaskCount,
      tasks: taskCount * 3,
      moods: moodCount,
    },
  });
}
```

- [ ] **Step 2: Create coins history route**

Create `src/app/api/coins/history/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Get recent earning events (last 50)
  const [sessions, subtasks, tasks, moods, redeemed] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, endedAt: { not: null }, coinsEarned: { gt: 0 } },
      select: { id: true, coinsEarned: true, endedAt: true, taskId: true },
      orderBy: { endedAt: "desc" },
      take: 20,
    }),
    prisma.subTask.findMany({
      where: { userId, completed: true },
      select: { id: true, name: true, completedAt: true, taskId: true },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    prisma.taskCompletion.findMany({
      where: { userId },
      select: { id: true, taskId: true, completedAt: true },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    prisma.moodEntry.findMany({
      where: { userId },
      select: { id: true, date: true, recordedAt: true },
      orderBy: { recordedAt: "desc" },
      take: 20,
    }),
    prisma.reward.findMany({
      where: { userId, redeemed: true },
      select: { id: true, name: true, cost: true, redeemedAt: true },
      orderBy: { redeemedAt: "desc" },
      take: 20,
    }),
  ]);

  type HistoryItem = {
    type: string;
    coins: number;
    label: string;
    date: Date | string | null;
  };

  const history: HistoryItem[] = [
    ...sessions.map((s) => ({
      type: "session" as const,
      coins: s.coinsEarned,
      label: `Session d'étude`,
      date: s.endedAt,
    })),
    ...subtasks.map((s) => ({
      type: "subtask" as const,
      coins: 1,
      label: `Sous-étape: ${s.name}`,
      date: s.completedAt,
    })),
    ...tasks.map((t) => ({
      type: "task" as const,
      coins: 3,
      label: `Tâche complétée`,
      date: t.completedAt,
    })),
    ...moods.map((m) => ({
      type: "mood" as const,
      coins: 1,
      label: `Log mood`,
      date: m.recordedAt,
    })),
    ...redeemed.map((r) => ({
      type: "redeem" as const,
      coins: -r.cost,
      label: `Récompense: ${r.name}`,
      date: r.redeemedAt,
    })),
  ];

  // Sort by date descending
  history.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return Response.json(history.slice(0, 50));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/coins/
git commit -m "feat: add coins balance and history API routes"
```

---

## Task 3: Rewards/Shop API

**Files:**
- Create: `src/app/api/rewards/route.ts`
- Create: `src/app/api/rewards/[id]/route.ts`

- [ ] **Step 1: Create rewards list/create route**

Create `src/app/api/rewards/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rewards = await prisma.reward.findMany({
    where: { userId: session.user.id },
    orderBy: [{ redeemed: "asc" }, { createdAt: "desc" }],
  });
  return Response.json(rewards);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, cost, icon } = (await req.json()) as {
    name: string;
    description?: string;
    cost: number;
    icon?: string;
  };

  if (!name || !cost || cost < 1)
    return Response.json({ error: "Name and cost required" }, { status: 400 });

  const reward = await prisma.reward.create({
    data: {
      userId: session.user.id,
      name,
      description: description ?? null,
      cost,
      icon: icon ?? "gift",
    },
  });
  return Response.json(reward);
}
```

- [ ] **Step 2: Create reward update/delete/redeem route**

Create `src/app/api/rewards/[id]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    redeem?: boolean;
    name?: string;
    description?: string;
    cost?: number;
    icon?: string;
  };

  if (body.redeem) {
    // Check balance before redeeming
    const reward = await prisma.reward.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!reward) return Response.json({ error: "Not found" }, { status: 404 });
    if (reward.redeemed)
      return Response.json({ error: "Already redeemed" }, { status: 400 });

    // Compute current balance
    const [sessionCoins, subtaskCount, taskCount, moodCount, redeemedCost] =
      await Promise.all([
        prisma.studySession
          .aggregate({
            where: { userId: session.user.id, endedAt: { not: null } },
            _sum: { coinsEarned: true },
          })
          .then((r) => r._sum.coinsEarned ?? 0),
        prisma.subTask.count({
          where: { userId: session.user.id, completed: true },
        }),
        prisma.taskCompletion.count({ where: { userId: session.user.id } }),
        prisma.moodEntry.count({ where: { userId: session.user.id } }),
        prisma.reward
          .aggregate({
            where: { userId: session.user.id, redeemed: true },
            _sum: { cost: true },
          })
          .then((r) => r._sum.cost ?? 0),
      ]);

    const balance =
      sessionCoins + subtaskCount + taskCount * 3 + moodCount - redeemedCost;

    if (balance < reward.cost)
      return Response.json({ error: "Not enough coins" }, { status: 400 });

    const updated = await prisma.reward.update({
      where: { id },
      data: { redeemed: true, redeemedAt: new Date() },
    });
    return Response.json(updated);
  }

  // Regular update (edit reward)
  const updated = await prisma.reward.update({
    where: { id, userId: session.user.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.cost !== undefined && { cost: body.cost }),
      ...(body.icon && { icon: body.icon }),
    },
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.reward.delete({
    where: { id, userId: session.user.id },
  });
  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/rewards/
git commit -m "feat: add rewards CRUD and redeem API routes"
```

---

## Task 4: Journal API

**Files:**
- Create: `src/app/api/journal/route.ts`
- Create: `src/app/api/journal/[date]/route.ts`

- [ ] **Step 1: Create journal list route**

Create `src/app/api/journal/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "14", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });
  return Response.json(entries);
}
```

- [ ] **Step 2: Create journal date route (get/auto-generate + update notes)**

Create `src/app/api/journal/[date]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function generateAutoData(userId: string, date: string) {
  // Gather all activity for this date
  const dayStart = new Date(date + "T00:00:00Z");
  const dayEnd = new Date(date + "T23:59:59Z");

  const [sessions, subtasks, completions, mood, activity] = await Promise.all([
    prisma.studySession.findMany({
      where: {
        userId,
        startedAt: { gte: dayStart, lte: dayEnd },
        endedAt: { not: null },
      },
    }),
    prisma.subTask.findMany({
      where: {
        userId,
        completed: true,
        completedAt: { gte: dayStart, lte: dayEnd },
      },
    }),
    prisma.taskCompletion.findMany({
      where: { userId, completedAt: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.moodEntry.findFirst({ where: { userId, date } }),
    prisma.dailyActivity.findFirst({ where: { userId, date } }),
  ]);

  const studyTimeMin = sessions.reduce((s, ss) => s + (ss.durationMin ?? 0), 0);
  const coinsFromSessions = sessions.reduce((s, ss) => s + ss.coinsEarned, 0);
  const coinsEarned = coinsFromSessions + subtasks.length + completions.length * 3 + (mood ? 1 : 0);

  return {
    tasksCompleted: activity?.taskNames ?? [],
    subtasksCompleted: subtasks.length,
    xpEarned: activity?.xpEarned ?? 0,
    studyTimeMin,
    sessionsCount: sessions.length,
    moodLevel: mood?.moodLevel ?? null,
    coinsEarned,
    streak: 0, // Will be computed client-side from activity hook
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const userId = session.user.id;

  // Try to find existing entry
  let entry = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId, date } },
  });

  // Auto-generate if not found
  if (!entry) {
    const autoData = await generateAutoData(userId, date);
    entry = await prisma.journalEntry.create({
      data: { userId, date, autoData },
    });
  }

  return Response.json(entry);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const { notes } = (await req.json()) as { notes: string };

  const entry = await prisma.journalEntry.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { notes },
    create: {
      userId: session.user.id,
      date,
      autoData: await generateAutoData(session.user.id, date),
      notes,
    },
  });
  return Response.json(entry);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/journal/
git commit -m "feat: add journal API with auto-generation from daily activity"
```

---

## Task 5: SWR Hooks — useCoins, useRewards, useJournal

**Files:**
- Create: `src/hooks/useCoins.ts`
- Create: `src/hooks/useRewards.ts`
- Create: `src/hooks/useJournal.ts`

- [ ] **Step 1: Create useCoins hook**

Create `src/hooks/useCoins.ts`:

```typescript
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type CoinBalance = {
  balance: number;
  earned: number;
  spent: number;
  breakdown: {
    sessions: number;
    subtasks: number;
    tasks: number;
    moods: number;
  };
};

type HistoryItem = {
  type: string;
  coins: number;
  label: string;
  date: string | null;
};

export function useCoins() {
  const {
    data: balanceData,
    mutate: mutateBalance,
    isLoading,
  } = useSWR<CoinBalance>("/api/coins/balance", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: history, mutate: mutateHistory } = useSWR<HistoryItem[]>(
    "/api/coins/history",
    fetcher,
    { revalidateOnFocus: false }
  );

  const refresh = () => {
    mutateBalance();
    mutateHistory();
  };

  return {
    balance: balanceData?.balance ?? 0,
    earned: balanceData?.earned ?? 0,
    spent: balanceData?.spent ?? 0,
    breakdown: balanceData?.breakdown ?? { sessions: 0, subtasks: 0, tasks: 0, moods: 0 },
    history: history ?? [],
    isLoading,
    refresh,
  };
}
```

- [ ] **Step 2: Create useRewards hook**

Create `src/hooks/useRewards.ts`:

```typescript
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Reward = {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  icon: string;
  redeemed: boolean;
  redeemedAt: string | null;
  createdAt: string;
};

export function useRewards() {
  const { data, mutate, isLoading } = useSWR<Reward[]>(
    "/api/rewards",
    fetcher,
    { revalidateOnFocus: false }
  );

  const rewards = data ?? [];
  const available = rewards.filter((r) => !r.redeemed);
  const redeemed = rewards.filter((r) => r.redeemed);

  const createReward = async (reward: {
    name: string;
    description?: string;
    cost: number;
    icon?: string;
  }) => {
    const res = await fetch("/api/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reward),
    });
    const created = await res.json();
    mutate([...rewards, created], false);
    return created;
  };

  const redeemReward = async (id: string) => {
    const res = await fetch(`/api/rewards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redeem: true }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    mutate();
    return res.json();
  };

  const deleteReward = async (id: string) => {
    mutate(
      rewards.filter((r) => r.id !== id),
      false
    );
    await fetch(`/api/rewards/${id}`, { method: "DELETE" });
    mutate();
  };

  return {
    rewards,
    available,
    redeemed,
    createReward,
    redeemReward,
    deleteReward,
    isLoading,
  };
}
```

- [ ] **Step 3: Create useJournal hook**

Create `src/hooks/useJournal.ts`:

```typescript
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type AutoData = {
  tasksCompleted: string[];
  subtasksCompleted: number;
  xpEarned: number;
  studyTimeMin: number;
  sessionsCount: number;
  moodLevel: number | null;
  coinsEarned: number;
  streak: number;
};

export type JournalEntry = {
  id: string;
  date: string;
  autoData: AutoData;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useJournal(limit = 14) {
  const { data, mutate, isLoading } = useSWR<JournalEntry[]>(
    `/api/journal?limit=${limit}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const entries = data ?? [];

  const updateNotes = async (date: string, notes: string) => {
    // Optimistic update
    mutate(
      entries.map((e) => (e.date === date ? { ...e, notes } : e)),
      false
    );
    await fetch(`/api/journal/${date}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    mutate();
  };

  const getEntry = async (date: string): Promise<JournalEntry> => {
    const res = await fetch(`/api/journal/${date}`);
    return res.json();
  };

  return { entries, updateNotes, getEntry, isLoading, refresh: mutate };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCoins.ts src/hooks/useRewards.ts src/hooks/useJournal.ts
git commit -m "feat: add useCoins, useRewards, useJournal SWR hooks"
```

---

## Task 6: Update Timer to Earn Coins on Session End

**Files:**
- Modify: `src/hooks/useTimer.tsx`

The timer must calculate and send `coinsEarned` when stopping a session (1 coin per 15 min).

- [ ] **Step 1: Update the stop function to include coinsEarned**

In `src/hooks/useTimer.tsx`, update the `stop` callback to compute coins and include in the PATCH body:

```typescript
// In the stop function, after computing durationMin:
const coinsEarned = Math.floor(durationMin / 15);
```

Add `coinsEarned` to the PATCH body sent to `/api/sessions/${state.sessionId}`.

Also update the return value of `stop` to include `coinsEarned`.

- [ ] **Step 2: Update the session PATCH API to accept coinsEarned**

In `src/app/api/sessions/[id]/route.ts`, add `coinsEarned` to the accepted body fields and the update data.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTimer.tsx src/app/api/sessions/
git commit -m "feat: timer earns coins (1 per 15 min) on session stop"
```

---

## Task 7: Shop Page UI

**Files:**
- Create: `src/app/dashboard/shop/page.tsx`
- Create: `src/app/dashboard/shop/layout.tsx`

- [ ] **Step 1: Create shop layout**

Create `src/app/dashboard/shop/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shop — NVIDIA Tracker" };

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Create shop page**

Create `src/app/dashboard/shop/page.tsx` with:

- Coin balance display at top (large, prominent)
- "Créer une récompense" button → opens inline form (name, description, cost, icon selector)
- Grid of reward cards: icon + name + cost + description + "Débloquer" button (disabled if insufficient coins)
- Section "Débloquées" at bottom showing redeemed rewards with dates
- Use `useCoins()` for balance and `useRewards()` for reward CRUD
- Confetti animation when a reward is redeemed (reuse existing `Confetti` component)
- Toast notifications for success/error

**Icon options** (simple emoji set): `gift`, `gamepad`, `food`, `movie`, `music`, `shopping`, `travel`, `star`. Map these to emojis in a helper.

The page should be a client component using the hooks. Style with Tailwind matching the existing dashboard aesthetic (dark theme, `bg-surface`, `border-border`, `text-nvidia` for accents).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/shop/
git commit -m "feat: add shop page with reward creation and redemption"
```

---

## Task 8: Coins Display in Dashboard Header

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add coin balance next to XP in the dashboard header**

Import `useCoins` in the dashboard page. Display the coin balance near the XP bar area with a coin icon. Format: `🪙 23` — compact, visible but not overwhelming.

Add it in the stats row alongside the existing XPBar/StatCard components.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: display coin balance in dashboard header"
```

---

## Task 9: Journal Page UI

**Files:**
- Create: `src/app/dashboard/journal/page.tsx`
- Create: `src/app/dashboard/journal/layout.tsx`

- [ ] **Step 1: Create journal layout**

Create `src/app/dashboard/journal/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Journal — NVIDIA Tracker" };

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Create journal page**

Create `src/app/dashboard/journal/page.tsx` with:

- Reverse chronological list of journal entries
- Each entry card shows:
  - Date header (formatted nicely, e.g. "Mardi 25 mars 2026")
  - Auto-summary row with icons: `[📋 3 tâches] [⚡ 120 XP] [⏱ 1h25] [🪙 8] [mood emoji]`
  - Editable notes textarea with placeholder "Ajoute tes réflexions..."
  - Optional prompts: "Qu'est-ce qui a été difficile ?", "Prochaine étape ?"
- Auto-generate today's entry on first visit (call `getEntry(todayDate)`)
- "Charger plus" button for pagination (load 14 entries at a time)
- Use `useJournal()` hook
- Style: dark cards with subtle borders, readable text, relaxed spacing

**Helper:** Create a mood emoji map: `{ 1: "😫", 2: "😔", 3: "😐", 4: "💪", 5: "🔥" }`.

**Helper:** Format minutes to readable time: `85` → `1h25`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/journal/
git commit -m "feat: add journal page with auto-generated entries and editable notes"
```

---

## Task 10: Resources Data — Enrich tasks.ts

**Files:**
- Modify: `src/lib/data/tasks.ts`

- [ ] **Step 1: Add Resource type and resources to tasks**

Add a `Resource` type to `tasks.ts`:

```typescript
export type Resource = {
  type: "video" | "doc" | "article" | "exam" | "tool" | "course";
  name: string;
  url: string;
};
```

Add `resources?: Resource[]` to the `Task` type.

- [ ] **Step 2: Add resources to existing tasks**

Add relevant NVIDIA/DL resources to tasks across all phases. Use real, well-known URLs where possible (NVIDIA DLI, DeepLearning.AI, 3Blue1Brown, PyTorch docs, Hugging Face, etc.). At minimum, add resources to 5-8 tasks across the 3 phases to demonstrate the feature. Tasks without resources will simply not show the resources button.

Example resources per type:
- `video`: YouTube tutorials, 3Blue1Brown, NVIDIA GTC talks
- `doc`: NVIDIA DLI course pages, PyTorch docs, Hugging Face docs
- `article`: Blog posts, papers, tutorials
- `exam`: NVIDIA certification exam blueprints and registration
- `course`: DeepLearning.AI, NVIDIA DLI courses
- `tool`: Colab notebooks, Kaggle, W&B

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/tasks.ts
git commit -m "feat: add NVIDIA and DL resource links to task definitions"
```

---

## Task 11: Resources in TaskItem

**Files:**
- Modify: `src/components/ui/TaskItem.tsx` (or wherever TaskItem is defined)

- [ ] **Step 1: Add resources dropdown to TaskItem**

Below the task detail/subtasks area, add a "Ressources (N)" button that expands to show the list of resources with type icons. Only show if the task has resources.

Type icon map:
- `video`: ▶️
- `doc`: 📖
- `article`: 📄
- `exam`: 🎓
- `tool`: 🛠
- `course`: 🎓

Each resource is a link that opens in a new tab (`target="_blank" rel="noopener noreferrer"`).

Use Framer Motion `AnimatePresence` for the dropdown animation (consistent with subtasks).

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/TaskItem.tsx
git commit -m "feat: add resources dropdown to task items"
```

---

## Task 12: Resources Page

**Files:**
- Create: `src/app/dashboard/resources/page.tsx`
- Create: `src/app/dashboard/resources/layout.tsx`

- [ ] **Step 1: Create resources layout**

Create `src/app/dashboard/resources/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ressources — NVIDIA Tracker" };

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Create resources page**

Create `src/app/dashboard/resources/page.tsx` with:

- Read all resources from `PHASES` data (client component)
- Filter bar: by phase (Phase 1/2/3 toggle buttons) and by type (video/doc/article/exam/tool/course)
- Search bar (filters by resource name or task name)
- Grid of resource cards: type icon + resource name + parent task name + phase badge
- Each card is a clickable link opening in new tab
- Empty state if no resources match filters

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/resources/
git commit -m "feat: add resources page with search and filters"
```

---

## Task 13: Update Navigation

**Files:**
- Modify: `src/components/ui/BottomNav.tsx`

- [ ] **Step 1: Update bottom nav to 5 items**

Update `NAV_ITEMS` to:

```typescript
const NAV_ITEMS = [
  { href: "/dashboard", label: "Accueil", icon: "🏠" },
  { href: "/dashboard/tasks", label: "Tâches", icon: "📋" },
  { href: "/dashboard/journal", label: "Journal", icon: "📓" },
  { href: "/dashboard/graphs", label: "Graphes", icon: "📊" },
  { href: "/dashboard/shop", label: "Shop", icon: "🪙" },
];
```

Budget is removed from nav (accessible from home or shop). Resources is accessible from tasks via the task items and via a link on the tasks page header.

- [ ] **Step 2: Add "Ressources" link on the tasks page**

In `src/app/dashboard/tasks/page.tsx`, add a subtle link/button to `/dashboard/resources` in the page header area: "📖 Toutes les ressources →"

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/BottomNav.tsx src/app/dashboard/tasks/page.tsx
git commit -m "feat: update navigation — add Journal and Shop, link to resources"
```

---

## Task 14: Integration Polish

- [ ] **Step 1: Verify all new pages render without errors**

Run `yarn dev` and visit:
- `/dashboard/shop`
- `/dashboard/journal`
- `/dashboard/resources`

Verify no console errors, proper loading states, and correct data flow.

- [ ] **Step 2: Run lint and fix issues**

```bash
yarn lint
```

Fix any ESLint errors. Common issues: unused imports, missing types, any types.

- [ ] **Step 3: Verify build succeeds**

```bash
yarn build
```

Fix any build errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: lint and build fixes for wave 2"
```
