# Wave 1 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Timer Flow, Micro-tasks (subtasks), and Quick Capture to the NVIDIA ADHD study tracker.

**Architecture:** Each feature follows the existing pattern: Prisma model → API route → SWR hook → React component. Timer state is global (React Context) so it persists across dashboard pages. Quick Capture uses a keyboard-triggered modal. Subtasks are nested under existing tasks with fractional XP.

**Tech Stack:** Next.js 16, Prisma 7, SWR, Framer Motion, Tailwind CSS v4, React 19.

**Spec:** `docs/superpowers/specs/2026-03-27-adhd-study-tracker-prd.md` — sections 1.1, 1.2, 1.3.

---

## Task 1: Prisma Schema — Add Wave 1 Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add StudySession, SubTask, QuickCapture models and User relations**

Add to the end of `prisma/schema.prisma` (before the closing of the file), and add relations to the `User` model:

```prisma
// Add these relations inside the existing User model, after the `deadlines` field:
  studySessions   StudySession[]
  subTasks        SubTask[]
  quickCaptures   QuickCapture[]
```

```prisma
// ── Wave 1: Foundations ──

model StudySession {
  id            String    @id @default(cuid())
  userId        String
  taskId        String?
  startedAt     DateTime  @default(now())
  endedAt       DateTime?
  durationMin   Int?
  pauseCount    Int       @default(0)
  totalPauseMin Int       @default(0)
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model SubTask {
  id          String    @id @default(cuid())
  userId      String
  taskId      String
  name        String
  sortOrder   Int       @default(0)
  completed   Boolean   @default(false)
  completedAt DateTime?
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, taskId, name])
}

model QuickCapture {
  id        String   @id @default(cuid())
  userId    String
  content   String   @db.Text
  createdAt DateTime @default(now())
  archived  Boolean  @default(false)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Generate Prisma client and push schema**

Run:
```bash
npx prisma generate && npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema." and new client generated in `src/generated/prisma`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add StudySession, SubTask, QuickCapture models (wave 1)"
```

---

## Task 2: Timer Flow — API Routes

**Files:**
- Create: `src/app/api/sessions/route.ts`
- Create: `src/app/api/sessions/[id]/route.ts`

- [ ] **Step 1: Create sessions list/create route**

Create `src/app/api/sessions/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sessions = await prisma.studySession.findMany({
    where: { userId: session.user.id, startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
  });
  return Response.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = (await req.json()) as { taskId?: string };

  const studySession = await prisma.studySession.create({
    data: { userId: session.user.id, taskId: taskId ?? null },
  });
  return Response.json(studySession);
}
```

- [ ] **Step 2: Create session update route**

Create `src/app/api/sessions/[id]/route.ts`:

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
    endedAt?: string;
    durationMin?: number;
    pauseCount?: number;
    totalPauseMin?: number;
    taskId?: string | null;
  };

  const updated = await prisma.studySession.update({
    where: { id, userId: session.user.id },
    data: {
      ...(body.endedAt && { endedAt: new Date(body.endedAt) }),
      ...(body.durationMin !== undefined && { durationMin: body.durationMin }),
      ...(body.pauseCount !== undefined && { pauseCount: body.pauseCount }),
      ...(body.totalPauseMin !== undefined && {
        totalPauseMin: body.totalPauseMin,
      }),
      ...(body.taskId !== undefined && { taskId: body.taskId }),
    },
  });
  return Response.json(updated);
}
```

- [ ] **Step 3: Verify API works**

Run: `yarn dev`
Test with curl (requires auth cookie — verify no build errors):
```bash
curl http://localhost:3000/api/sessions
```
Expected: 401 Unauthorized (no session) — confirms route loads without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sessions/
git commit -m "feat: add study session API routes (start, update, list)"
```

---

## Task 3: Timer Flow — React Context

**Files:**
- Create: `src/hooks/useTimer.tsx`

- [ ] **Step 1: Create the timer context and provider**

Create `src/hooks/useTimer.tsx`:

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type TimerState = {
  isRunning: boolean;
  isPaused: boolean;
  elapsedSec: number;
  pauseElapsedSec: number;
  pauseCount: number;
  sessionId: string | null;
  taskId: string | null;
  taskName: string | null;
  nudgeIntervalMin: number;
  showNudge: boolean;
};

type TimerActions = {
  start: (taskId?: string, taskName?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ durationMin: number; pauseCount: number } | null>;
  dismissNudge: () => void;
  setNudgeInterval: (min: number) => void;
  linkTask: (taskId: string, taskName: string) => void;
};

type TimerContextValue = TimerState & TimerActions;

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    elapsedSec: 0,
    pauseElapsedSec: 0,
    pauseCount: 0,
    sessionId: null,
    taskId: null,
    taskName: null,
    nudgeIntervalMin: 30,
    showNudge: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const totalPauseRef = useRef<number>(0);

  // Main timer tick
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor(
          (now - startTimeRef.current - totalPauseRef.current) / 1000
        );
        setState((s) => ({ ...s, elapsedSec: elapsed }));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.isPaused]);

  // Pause timer tick
  useEffect(() => {
    if (state.isPaused) {
      pauseIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const pauseElapsed = Math.floor((now - pauseStartRef.current) / 1000);
        setState((s) => ({ ...s, pauseElapsedSec: pauseElapsed }));
      }, 1000);
    }
    return () => {
      if (pauseIntervalRef.current) clearInterval(pauseIntervalRef.current);
    };
  }, [state.isPaused]);

  // Nudge check
  useEffect(() => {
    if (!state.isRunning || state.isPaused || state.nudgeIntervalMin <= 0)
      return;
    const nudgeSec = state.nudgeIntervalMin * 60;
    if (
      state.elapsedSec > 0 &&
      state.elapsedSec % nudgeSec === 0 &&
      !state.showNudge
    ) {
      setState((s) => ({ ...s, showNudge: true }));
    }
  }, [
    state.elapsedSec,
    state.isRunning,
    state.isPaused,
    state.nudgeIntervalMin,
    state.showNudge,
  ]);

  const start = useCallback(
    async (taskId?: string, taskName?: string) => {
      if (state.isRunning) return;
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: taskId ?? null }),
        });
        const session = await res.json();
        startTimeRef.current = Date.now();
        totalPauseRef.current = 0;
        setState((s) => ({
          ...s,
          isRunning: true,
          isPaused: false,
          elapsedSec: 0,
          pauseElapsedSec: 0,
          pauseCount: 0,
          sessionId: session.id,
          taskId: taskId ?? null,
          taskName: taskName ?? null,
          showNudge: false,
        }));
      } catch {
        // Silently fail — user can retry
      }
    },
    [state.isRunning]
  );

  const pause = useCallback(() => {
    if (!state.isRunning || state.isPaused) return;
    pauseStartRef.current = Date.now();
    setState((s) => ({
      ...s,
      isPaused: true,
      pauseCount: s.pauseCount + 1,
      pauseElapsedSec: 0,
      showNudge: false,
    }));
  }, [state.isRunning, state.isPaused]);

  const resume = useCallback(() => {
    if (!state.isPaused) return;
    totalPauseRef.current += Date.now() - pauseStartRef.current;
    setState((s) => ({ ...s, isPaused: false, pauseElapsedSec: 0 }));
  }, [state.isPaused]);

  const stop = useCallback(async () => {
    if (!state.isRunning || !state.sessionId) return null;
    const durationMin = Math.round(state.elapsedSec / 60);
    const totalPauseMin = Math.round(
      (totalPauseRef.current + (state.isPaused ? Date.now() - pauseStartRef.current : 0)) / 60000
    );

    try {
      await fetch(`/api/sessions/${state.sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endedAt: new Date().toISOString(),
          durationMin,
          pauseCount: state.pauseCount,
          totalPauseMin,
        }),
      });
    } catch {
      // Session saved locally at minimum
    }

    const result = { durationMin, pauseCount: state.pauseCount };
    setState((s) => ({
      ...s,
      isRunning: false,
      isPaused: false,
      elapsedSec: 0,
      pauseElapsedSec: 0,
      pauseCount: 0,
      sessionId: null,
      taskId: null,
      taskName: null,
      showNudge: false,
    }));

    return result;
  }, [state.isRunning, state.sessionId, state.elapsedSec, state.isPaused, state.pauseCount]);

  const dismissNudge = useCallback(() => {
    setState((s) => ({ ...s, showNudge: false }));
  }, []);

  const setNudgeInterval = useCallback((min: number) => {
    setState((s) => ({ ...s, nudgeIntervalMin: min }));
  }, []);

  const linkTask = useCallback(
    (taskId: string, taskName: string) => {
      setState((s) => ({ ...s, taskId, taskName }));
      if (state.sessionId) {
        fetch(`/api/sessions/${state.sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        }).catch(() => {});
      }
    },
    [state.sessionId]
  );

  return (
    <TimerContext.Provider
      value={{ ...state, start, pause, resume, stop, dismissNudge, setNudgeInterval, linkTask }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used within TimerProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useTimer.tsx
git commit -m "feat: add timer flow context with nudge system"
```

---

## Task 4: Timer Flow — TimerBar Component

**Files:**
- Create: `src/components/ui/TimerBar.tsx`

- [ ] **Step 1: Create the timer bar component**

Create `src/components/ui/TimerBar.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTimer } from "@/hooks/useTimer";

function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function TimerBar() {
  const {
    isRunning,
    isPaused,
    elapsedSec,
    pauseElapsedSec,
    taskName,
    showNudge,
    start,
    pause,
    resume,
    stop,
    dismissNudge,
  } = useTimer();

  const isHyperfocus = elapsedSec >= 7200; // 2 hours

  return (
    <>
      {/* Start button when no session */}
      {!isRunning && (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => start()}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-nvidia/30 bg-nvidia/10 py-3 text-sm font-bold text-nvidia transition-colors hover:bg-nvidia/20"
        >
          <span className="text-lg">▶</span> Start Flow
        </motion.button>
      )}

      {/* Active timer bar */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`mb-4 overflow-hidden rounded-xl border ${
              isHyperfocus
                ? "border-coral/50 bg-coral/10"
                : "border-nvidia/30 bg-nvidia/10"
            }`}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {/* Pulsing dot */}
                <div className="relative">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      isPaused ? "bg-amber" : "bg-nvidia"
                    }`}
                  />
                  {!isPaused && (
                    <div className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-nvidia/50" />
                  )}
                </div>

                {/* Time display */}
                <span
                  className={`font-mono text-lg font-bold ${
                    isHyperfocus ? "text-coral" : "text-nvidia"
                  }`}
                >
                  {formatTime(elapsedSec)}
                </span>

                {/* Task name */}
                {taskName && (
                  <span className="max-w-[150px] truncate text-xs text-muted">
                    {taskName}
                  </span>
                )}

                {/* Pause time */}
                {isPaused && (
                  <span className="text-xs text-amber">
                    Pause {formatTime(pauseElapsedSec)}
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {isPaused ? (
                  <button
                    onClick={resume}
                    className="rounded-lg bg-nvidia/20 px-3 py-1.5 text-xs font-bold text-nvidia hover:bg-nvidia/30"
                  >
                    Reprendre
                  </button>
                ) : (
                  <button
                    onClick={pause}
                    className="rounded-lg bg-surface2 px-3 py-1.5 text-xs font-bold text-muted hover:text-white"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={stop}
                  className="rounded-lg bg-coral/20 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral/30"
                >
                  Stop
                </button>
              </div>
            </div>

            {/* Hyperfocus warning */}
            {isHyperfocus && !isPaused && (
              <div className="border-t border-coral/20 bg-coral/5 px-4 py-2 text-center text-xs text-coral">
                ⚠️ +2h sans pause — pense à souffler !
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nudge modal */}
      <AnimatePresence>
        {showNudge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="mx-4 max-w-sm rounded-2xl border border-border bg-surface p-6 text-center"
            >
              <p className="text-2xl">⏰</p>
              <p className="mt-2 text-sm font-bold text-white">
                Tu tournes depuis {formatTime(elapsedSec)}
              </p>
              <p className="mt-1 text-xs text-muted">Besoin d&apos;une pause ?</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    dismissNudge();
                    pause();
                  }}
                  className="flex-1 rounded-lg bg-nvidia px-4 py-2 text-sm font-bold text-bg"
                >
                  Pause
                </button>
                <button
                  onClick={dismissNudge}
                  className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2 text-sm text-muted hover:text-white"
                >
                  Je continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/TimerBar.tsx
git commit -m "feat: add TimerBar component with nudge modal"
```

---

## Task 5: Timer Flow — Integration

**Files:**
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/ui/FocusCard.tsx`

- [ ] **Step 1: Wrap dashboard layout with TimerProvider**

In `src/app/dashboard/layout.tsx`, add the TimerProvider:

```typescript
"use client";

import BottomNav from "@/components/ui/BottomNav";
import { TimerProvider } from "@/hooks/useTimer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimerProvider>
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
        <BottomNav />
      </div>
    </TimerProvider>
  );
}
```

- [ ] **Step 2: Add TimerBar to the dashboard page**

In `src/app/dashboard/page.tsx`, add the import and place TimerBar at the top of the grid:

Add import:
```typescript
import TimerBar from "@/components/ui/TimerBar";
```

Add as the first child inside the return, before the grid div:
```tsx
return (
  <>
    <TimerBar />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ... existing content ... */}
    </div>
  </>
);
```

- [ ] **Step 3: Add "Start Flow" button to FocusCard**

In `src/components/ui/FocusCard.tsx`, add timer integration:

Add import:
```typescript
import { useTimer } from "@/hooks/useTimer";
```

Inside the `FocusCard` component, after `const nextAfter = ...`:
```typescript
const timer = useTimer();
```

Add a timer button next to the existing buttons, inside the `mt-4 flex gap-2` div:
```tsx
<div className="mt-4 flex gap-2">
  <button
    onClick={() => onComplete(nextTask.id, nextTask.xp, nextTask.name)}
    className="rounded-lg bg-nvidia px-4 py-2 text-sm font-bold text-bg transition-transform hover:scale-105 active:scale-95"
  >
    C&apos;est fait ! +{nextTask.xp} XP
  </button>
  {!timer.isRunning && (
    <button
      onClick={() => timer.start(nextTask.id, nextTask.name)}
      className="rounded-lg border border-nvidia/30 bg-nvidia/10 px-4 py-2 text-sm font-bold text-nvidia hover:bg-nvidia/20"
    >
      ▶ Flow
    </button>
  )}
  {nextAfter && (
    <button
      onClick={() =>
        onComplete(nextAfter.id, nextAfter.xp, nextAfter.name)
      }
      className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm text-muted transition-colors hover:text-white"
    >
      Suivante →
    </button>
  )}
</div>
```

- [ ] **Step 4: Verify — run dev server and test timer**

Run: `yarn dev`
1. Open http://localhost:3000/dashboard
2. Click "Start Flow" — timer should appear with running time
3. Click "Pause" — timer should pause, show pause time
4. Click "Reprendre" — timer resumes
5. Wait for nudge interval or reduce to 1 min for testing
6. Click "Stop" — timer disappears
7. Navigate to /dashboard/tasks and back — timer should persist (context)

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/dashboard/page.tsx src/components/ui/FocusCard.tsx
git commit -m "feat: integrate timer flow into dashboard and focus card"
```

---

## Task 6: Micro-tasks — Enrich Task Data

**Files:**
- Modify: `src/lib/data/tasks.ts`

- [ ] **Step 1: Add subtasks type and data to tasks.ts**

Update the `Task` type to include optional subtasks:

```typescript
export type Task = {
  id: string;
  name: string;
  detail: string;
  xp: number;
  certif?: boolean;
  subtasks?: string[];
};
```

Add `subtasks` arrays to the Phase 1 and Phase 2 tasks. Phase 3 (certif) tasks stay without subtasks (user creates their own):

```typescript
// Inside PHASES[0].tasks (Phase 1):
{
  id: "t1",
  name: "Deep Learning Spec — Cours 1 & 2",
  detail: "Réseaux neuronaux, backprop · DeepLearning.AI",
  xp: 40,
  subtasks: [
    "Regarder Cours 1 : intro réseaux neuronaux (1h)",
    "Compléter les exercices du Cours 1",
    "Regarder Cours 2 : backpropagation (1h)",
    "Compléter les exercices du Cours 2",
  ],
},
{
  id: "t2",
  name: "Fast.ai — Leçons 1 à 4",
  detail: "PyTorch hands-on · Gratuit",
  xp: 60,
  subtasks: [
    "Leçon 1 : premier modèle en 5 min",
    "Leçon 2 : déploiement d'un modèle",
    "Leçon 3 : éthique et data pipeline",
    "Leçon 4 : NLP et tabular data",
    "Coder un mini-projet avec ce qu'on a appris",
  ],
},
{
  id: "t3",
  name: "Deep Learning Spec — Cours 4 (Seq. Models)",
  detail: "RNN, LSTM, mécanismes attention",
  xp: 50,
  subtasks: [
    "Regarder section RNN et BPTT (45 min)",
    "Regarder section LSTM et GRU (45 min)",
    "Regarder section mécanismes d'attention (30 min)",
    "Compléter les exercices du Cours 4",
  ],
},
{
  id: "t4",
  name: "Deep Learning Spec — Cours 5 (Transformers)",
  detail: "Architecture Transformer, BERT, GPT",
  xp: 70,
  subtasks: [
    "Regarder section self-attention (45 min)",
    "Regarder section architecture Transformer complète (45 min)",
    "Regarder section BERT et GPT (30 min)",
    "Compléter les exercices du Cours 5",
    "Relire le papier 'Attention Is All You Need' (résumé)",
  ],
},
{
  id: "t5",
  name: "Mini-projet : classifier du texte Python",
  detail: "Consolider par la pratique · PyTorch",
  xp: 80,
  subtasks: [
    "Choisir un dataset texte (IMDB, AG News, etc.)",
    "Preprocessing : tokenization + vocabulaire",
    "Coder le modèle (LSTM ou Transformer simple)",
    "Entraîner et évaluer (accuracy, loss curves)",
    "Documenter les résultats dans un notebook",
  ],
},

// Inside PHASES[1].tasks (Phase 2):
{
  id: "t6",
  name: "NVIDIA DLI — Generative AI Explained",
  detail: "Gratuit · GenAI, LLMs, diffusion",
  xp: 50,
  subtasks: [
    "Module 1 : Introduction à la GenAI",
    "Module 2 : LLMs et architectures",
    "Module 3 : Diffusion models",
    "Quiz final du cours",
  ],
},
{
  id: "t7",
  name: "Hugging Face NLP Course (chap. 1–4)",
  detail: "Tokenizers, fine-tuning, pipelines",
  xp: 60,
  subtasks: [
    "Chapitre 1 : Transformer models",
    "Chapitre 2 : Using Transformers",
    "Chapitre 3 : Fine-tuning a pretrained model",
    "Chapitre 4 : Sharing models and tokenizers",
  ],
},
{
  id: "t8",
  name: "DeepLearning.AI — Prompt Engineering",
  detail: "CoT, zero/few-shot · Gratuit",
  xp: 40,
  subtasks: [
    "Leçon : principes de prompting",
    "Leçon : chain-of-thought et few-shot",
    "Pratiquer 10 prompts sur ChatGPT/Claude",
  ],
},
{
  id: "t9",
  name: "NVIDIA DLI — Building RAG Agents",
  detail: "Gratuit · RAG, NIM, embeddings",
  xp: 80,
  subtasks: [
    "Module : embeddings et vector stores",
    "Module : retrieval pipeline",
    "Module : RAG avec NIM",
    "Lab : construire un agent RAG end-to-end",
    "Documenter l'architecture du pipeline",
  ],
},
{
  id: "t10",
  name: "DeepLearning.AI — LangChain Short Course",
  detail: "Agents, chains, memory · Gratuit",
  xp: 60,
  subtasks: [
    "Leçon : Models, Prompts, Parsers",
    "Leçon : Chains et séquençage",
    "Leçon : Agents et tools",
    "Coder un mini-agent avec LangChain",
  ],
},
{
  id: "t11",
  name: "Hugging Face — Fine-tuning LoRA/PEFT",
  detail: "Chapitres 7–9 du cours HF",
  xp: 90,
  subtasks: [
    "Chapitre 7 : Tokenizers en détail",
    "Chapitre 8 : main NLP tasks (classification, NER, QA)",
    "Chapitre 9 : building et sharing demos",
    "Lab : fine-tuner un modèle avec LoRA/PEFT",
    "Comparer les résultats avant/après fine-tuning",
  ],
},
{
  id: "t12",
  name: "TensorRT-LLM + Triton Inference Server",
  detail: "Labs NVIDIA NGC cloud",
  xp: 100,
  subtasks: [
    "Setup : accès NGC et env cloud",
    "Lab 1 : convertir un modèle en TensorRT-LLM",
    "Lab 2 : déployer avec Triton Inference Server",
    "Benchmark : comparer latence avant/après TensorRT",
    "Documenter la config optimale",
  ],
},
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/tasks.ts
git commit -m "feat: add subtask definitions to Phase 1 and Phase 2 tasks"
```

---

## Task 7: Micro-tasks — API Routes

**Files:**
- Create: `src/app/api/subtasks/route.ts`
- Create: `src/app/api/subtasks/[id]/route.ts`

- [ ] **Step 1: Create subtasks list/create route**

Create `src/app/api/subtasks/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  const where: { userId: string; taskId?: string } = {
    userId: session.user.id,
  };
  if (taskId) where.taskId = taskId;

  const subtasks = await prisma.subTask.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(subtasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, name, sortOrder } = (await req.json()) as {
    taskId: string;
    name: string;
    sortOrder?: number;
  };

  const subtask = await prisma.subTask.create({
    data: {
      userId: session.user.id,
      taskId,
      name,
      sortOrder: sortOrder ?? 0,
    },
  });
  return Response.json(subtask);
}
```

- [ ] **Step 2: Create subtask update/delete route**

Create `src/app/api/subtasks/[id]/route.ts`:

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
    completed?: boolean;
    name?: string;
    sortOrder?: number;
  };

  const updated = await prisma.subTask.update({
    where: { id, userId: session.user.id },
    data: {
      ...(body.completed !== undefined && {
        completed: body.completed,
        completedAt: body.completed ? new Date() : null,
      }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
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

  await prisma.subTask.delete({
    where: { id, userId: session.user.id },
  });
  return Response.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/subtasks/
git commit -m "feat: add subtask CRUD API routes"
```

---

## Task 8: Micro-tasks — Hook

**Files:**
- Create: `src/hooks/useSubtasks.ts`

- [ ] **Step 1: Create the SWR hook for subtasks**

Create `src/hooks/useSubtasks.ts`:

```typescript
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SubTask = {
  id: string;
  taskId: string;
  name: string;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
};

export function useSubtasks(taskId: string) {
  const { data, mutate, isLoading } = useSWR<SubTask[]>(
    `/api/subtasks?taskId=${taskId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const subtasks: SubTask[] = data ?? [];
  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  const toggleSubtask = async (id: string, completed: boolean) => {
    mutate(
      subtasks.map((s) =>
        s.id === id
          ? { ...s, completed, completedAt: completed ? new Date().toISOString() : null }
          : s
      ),
      false
    );

    await fetch(`/api/subtasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    mutate();
  };

  const addSubtask = async (name: string) => {
    const sortOrder = subtasks.length;
    const res = await fetch("/api/subtasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, name, sortOrder }),
    });
    const newSubtask = await res.json();
    mutate([...subtasks, newSubtask], false);
  };

  const deleteSubtask = async (id: string) => {
    mutate(
      subtasks.filter((s) => s.id !== id),
      false
    );
    await fetch(`/api/subtasks/${id}`, { method: "DELETE" });
    mutate();
  };

  return {
    subtasks,
    completedCount,
    totalCount,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    isLoading,
    mutate,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSubtasks.ts
git commit -m "feat: add useSubtasks SWR hook"
```

---

## Task 9: Micro-tasks — SubTaskList Component

**Files:**
- Create: `src/components/ui/SubTaskList.tsx`

- [ ] **Step 1: Create the subtask list component**

Create `src/components/ui/SubTaskList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubtasks } from "@/hooks/useSubtasks";

type Props = {
  taskId: string;
  defaultSubtasks?: string[];
  xpPerSubtask: number;
  onSubtaskComplete?: () => void;
};

export default function SubTaskList({
  taskId,
  defaultSubtasks,
  xpPerSubtask,
  onSubtaskComplete,
}: Props) {
  const {
    subtasks,
    completedCount,
    totalCount,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    isLoading,
    mutate,
  } = useSubtasks(taskId);

  const [newName, setNewName] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Seed default subtasks on first open if none exist
  if (!isLoading && subtasks.length === 0 && defaultSubtasks && !initialized) {
    setInitialized(true);
    Promise.all(
      defaultSubtasks.map((name, i) =>
        fetch("/api/subtasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, name, sortOrder: i }),
        })
      )
    ).then(() => mutate());
  }

  const handleToggle = async (id: string, completed: boolean) => {
    await toggleSubtask(id, completed);
    if (completed && onSubtaskComplete) {
      onSubtaskComplete();
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await addSubtask(name);
    setNewName("");
  };

  if (isLoading) {
    return (
      <div className="mt-2 h-6 w-24 animate-pulse rounded bg-surface2" />
    );
  }

  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mt-3 space-y-2">
      {/* Mini progress bar */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface2">
            <motion.div
              className="h-full rounded-full bg-nvidia"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted">
            {completedCount}/{totalCount}
          </span>
        </div>
      )}

      {/* Subtask items */}
      <AnimatePresence>
        {subtasks.map((st) => (
          <motion.div
            key={st.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 pl-2"
          >
            <button
              onClick={() => handleToggle(st.id, !st.completed)}
              className="flex-shrink-0"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  st.completed
                    ? "border-nvidia bg-nvidia text-bg"
                    : "border-muted bg-transparent"
                }`}
              >
                {st.completed && (
                  <svg
                    className="h-2.5 w-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
            <span
              className={`flex-1 text-xs ${
                st.completed ? "text-muted line-through" : "text-white/80"
              }`}
            >
              {st.name}
            </span>
            <span className="font-mono text-[10px] text-nvidia/60">
              +{xpPerSubtask} XP
            </span>
            <button
              onClick={() => deleteSubtask(st.id)}
              className="text-[10px] text-muted hover:text-coral"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add subtask input */}
      <div className="flex items-center gap-2 pl-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="+ Ajouter une sous-étape"
          className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-muted/50 focus:outline-none"
        />
        {newName.trim() && (
          <button
            onClick={handleAdd}
            className="text-xs font-bold text-nvidia hover:text-nvidia2"
          >
            Ajouter
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/SubTaskList.tsx
git commit -m "feat: add SubTaskList component with auto-seeding"
```

---

## Task 10: Micro-tasks — Integration into TaskItem

**Files:**
- Modify: `src/components/ui/TaskItem.tsx`

- [ ] **Step 1: Add SubTaskList to TaskItem**

In `src/components/ui/TaskItem.tsx`:

Add import at top:
```typescript
import SubTaskList from "./SubTaskList";
```

Update the Props type to include `onSubtaskComplete`:
```typescript
type Props = {
  task: Task;
  done: boolean;
  note?: string;
  onToggle: () => void;
  onUpdateNote: (note: string) => void;
  onSubtaskComplete?: () => void;
};
```

Add `onSubtaskComplete` to the destructured props:
```typescript
export default function TaskItem({
  task,
  done,
  note,
  onToggle,
  onUpdateNote,
  onSubtaskComplete,
}: Props) {
```

Add the SubTaskList component after the note textarea section (before the closing `</div>` of the `flex-1 min-w-0` div), only when the task is not yet completed:
```tsx
{!done && (task.subtasks || !task.certif) && (
  <SubTaskList
    taskId={task.id}
    defaultSubtasks={task.subtasks}
    xpPerSubtask={
      task.subtasks
        ? Math.round(task.xp / task.subtasks.length)
        : Math.round(task.xp / 3)
    }
    onSubtaskComplete={onSubtaskComplete}
  />
)}
```

Note: We show SubTaskList for tasks with predefined subtasks OR for non-certif tasks (which get the free-form input). Certif tasks without predefined subtasks also get the input since the user requested it.

Actually, per the PRD: "Pour les tâches certif (sans subtasks) : champ Ajouter une sous-étape libre". So ALL uncompleted tasks should show SubTaskList. Simplify to:

```tsx
{!done && (
  <SubTaskList
    taskId={task.id}
    defaultSubtasks={task.subtasks}
    xpPerSubtask={
      task.subtasks
        ? Math.round(task.xp / task.subtasks.length)
        : Math.round(task.xp / 3)
    }
    onSubtaskComplete={onSubtaskComplete}
  />
)}
```

- [ ] **Step 2: Pass onSubtaskComplete from TaskPhase**

In `src/components/ui/TaskPhase.tsx`, update the TaskItem render to pass the callback. No new prop needed on TaskPhase itself — the subtask completion is a local micro-reward (no XP from parent task yet).

Add a no-op or toast-ready callback in the TaskItem render inside TaskPhase:
```tsx
<TaskItem
  key={task.id}
  task={task}
  done={completedIds.has(task.id)}
  note={completion?.note}
  onToggle={() => onToggle(task.id, task.xp, task.name)}
  onUpdateNote={(note) => onUpdateNote(task.id, note)}
  onSubtaskComplete={() => {
    // Will be used for coins in Wave 2
  }}
/>
```

- [ ] **Step 3: Verify**

Run: `yarn dev`
1. Go to /dashboard/tasks
2. Expand Phase 1 — tasks should show subtask checkboxes (seeded from defaults)
3. Check a subtask — should animate
4. Add a custom subtask — should appear
5. Delete a subtask — should disappear
6. Phase 3 (certif) tasks — should show empty input field for custom subtasks

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/TaskItem.tsx src/components/ui/TaskPhase.tsx
git commit -m "feat: integrate subtasks into task items"
```

---

## Task 11: Quick Capture — API Route

**Files:**
- Create: `src/app/api/captures/route.ts`
- Create: `src/app/api/captures/[id]/route.ts`

- [ ] **Step 1: Create captures list/create route**

Create `src/app/api/captures/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showArchived = searchParams.get("archived") === "true";

  const captures = await prisma.quickCapture.findMany({
    where: {
      userId: session.user.id,
      ...(showArchived ? {} : { archived: false }),
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(captures);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = (await req.json()) as { content: string };
  if (!content?.trim())
    return Response.json({ error: "Content required" }, { status: 400 });

  const capture = await prisma.quickCapture.create({
    data: { userId: session.user.id, content: content.trim() },
  });
  return Response.json(capture);
}
```

- [ ] **Step 2: Create capture archive route**

Create `src/app/api/captures/[id]/route.ts`:

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
  const { archived } = (await req.json()) as { archived: boolean };

  const updated = await prisma.quickCapture.update({
    where: { id, userId: session.user.id },
    data: { archived },
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

  await prisma.quickCapture.delete({
    where: { id, userId: session.user.id },
  });
  return Response.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/captures/
git commit -m "feat: add quick capture CRUD API routes"
```

---

## Task 12: Quick Capture — Hook

**Files:**
- Create: `src/hooks/useCaptures.ts`

- [ ] **Step 1: Create the SWR hook**

Create `src/hooks/useCaptures.ts`:

```typescript
"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Capture = {
  id: string;
  content: string;
  createdAt: string;
  archived: boolean;
};

export function useCaptures() {
  const { data, mutate, isLoading } = useSWR<Capture[]>(
    "/api/captures",
    fetcher,
    { revalidateOnFocus: false }
  );

  const captures: Capture[] = data ?? [];

  const addCapture = async (content: string) => {
    const optimistic: Capture = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      archived: false,
    };
    mutate([optimistic, ...captures], false);

    const res = await fetch("/api/captures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const created = await res.json();
    mutate([created, ...captures.filter((c) => c.id !== optimistic.id)], false);
  };

  const archiveCapture = async (id: string) => {
    mutate(
      captures.map((c) => (c.id === id ? { ...c, archived: true } : c)),
      false
    );
    await fetch(`/api/captures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    mutate();
  };

  const deleteCapture = async (id: string) => {
    mutate(
      captures.filter((c) => c.id !== id),
      false
    );
    await fetch(`/api/captures/${id}`, { method: "DELETE" });
    mutate();
  };

  return { captures, addCapture, archiveCapture, deleteCapture, isLoading };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCaptures.ts
git commit -m "feat: add useCaptures SWR hook"
```

---

## Task 13: Quick Capture — Modal Component

**Files:**
- Create: `src/components/ui/QuickCaptureModal.tsx`

- [ ] **Step 1: Create the keyboard-triggered modal**

Create `src/components/ui/QuickCaptureModal.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCaptures } from "@/hooks/useCaptures";

export default function QuickCaptureModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { addCapture } = useCaptures();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setText("");
      setSaved(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSave = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    await addCapture(content);
    setSaved(true);
    setTimeout(() => {
      setIsOpen(false);
      setSaved(false);
    }, 600);
  }, [text, addCapture]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 px-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💭</span>
                  <span className="text-xs font-semibold text-muted">
                    Quick Capture
                  </span>
                </div>
                <kbd className="rounded border border-border bg-surface2 px-1.5 py-0.5 text-[10px] text-muted">
                  ⌘K
                </kbd>
              </div>

              {/* Input */}
              <div className="p-4">
                {saved ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center gap-2 py-4"
                  >
                    <span className="text-nvidia">✓</span>
                    <span className="text-sm text-nvidia">Capturé !</span>
                  </motion.div>
                ) : (
                  <>
                    <textarea
                      ref={inputRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Qu'est-ce qui te passe par la tête ?"
                      className="w-full resize-none bg-transparent text-sm text-white placeholder:text-muted/50 focus:outline-none"
                      rows={3}
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-muted">
                        Enter pour sauver · Shift+Enter pour nouvelle ligne
                      </span>
                      <button
                        onClick={handleSave}
                        disabled={!text.trim()}
                        className="rounded-lg bg-nvidia px-3 py-1.5 text-xs font-bold text-bg disabled:opacity-30"
                      >
                        Capturer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/QuickCaptureModal.tsx
git commit -m "feat: add QuickCaptureModal with Cmd+K shortcut"
```

---

## Task 14: Quick Capture — Brain Dump Section & Integration

**Files:**
- Create: `src/components/ui/BrainDump.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create BrainDump collapsible section**

Create `src/components/ui/BrainDump.tsx`:

```tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCaptures } from "@/hooks/useCaptures";

export default function BrainDump() {
  const { captures, archiveCapture, deleteCapture, isLoading } = useCaptures();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;
  if (captures.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span>💭</span>
          <span className="text-sm font-bold text-white">Brain Dump</span>
          <span className="rounded-full bg-nvidia/20 px-2 py-0.5 font-mono text-[10px] font-bold text-nvidia">
            {captures.length}
          </span>
        </div>
        <span
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-2 space-y-2">
              {captures.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 rounded-lg border border-border/50 bg-surface2/50 p-3"
                >
                  <p className="flex-1 text-xs text-white/80">{c.content}</p>
                  <div className="flex flex-shrink-0 gap-1">
                    <button
                      onClick={() => archiveCapture(c.id)}
                      className="text-[10px] text-muted hover:text-nvidia"
                      title="Archiver"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => deleteCapture(c.id)}
                      className="text-[10px] text-muted hover:text-coral"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Add QuickCaptureModal to dashboard layout**

In `src/app/dashboard/layout.tsx`, add the modal (available on all dashboard pages):

```typescript
"use client";

import BottomNav from "@/components/ui/BottomNav";
import QuickCaptureModal from "@/components/ui/QuickCaptureModal";
import { TimerProvider } from "@/hooks/useTimer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TimerProvider>
      <div className="min-h-screen bg-bg">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
        <BottomNav />
        <QuickCaptureModal />
      </div>
    </TimerProvider>
  );
}
```

- [ ] **Step 3: Add BrainDump section to dashboard page**

In `src/app/dashboard/page.tsx`, add the import:
```typescript
import BrainDump from "@/components/ui/BrainDump";
```

Add `<BrainDump />` in the left column, after the FocusCard:
```tsx
<FocusCard completedIds={completedIds} onComplete={handleComplete} />
<BrainDump />
```

- [ ] **Step 4: Verify everything works**

Run: `yarn dev`
1. Open http://localhost:3000/dashboard
2. Press Cmd+K — modal should open
3. Type a thought and press Enter — should show "Capturé !" and close
4. Brain Dump section should appear in the dashboard with the capture
5. Press Cmd+K again from /dashboard/tasks — should still work
6. Archive a capture — should disappear from the list
7. Timer should still work alongside Quick Capture

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/BrainDump.tsx src/app/dashboard/layout.tsx src/app/dashboard/page.tsx
git commit -m "feat: integrate quick capture modal and brain dump section"
```

---

## Task 15: Final Verification & Cleanup

- [ ] **Step 1: Run lint**

```bash
yarn lint
```

Fix any issues found.

- [ ] **Step 2: Run build**

```bash
yarn build
```

Verify no TypeScript or build errors.

- [ ] **Step 3: Manual smoke test**

Full test pass:
1. **Timer Flow**: Start → Pause → Resume → Stop. Check timer persists across pages. Nudge appears at interval.
2. **Micro-tasks**: Expand a task → see subtasks → check one → add custom → delete one. Verify Phase 3 certif tasks show empty input.
3. **Quick Capture**: Cmd+K → type → Enter → verify in Brain Dump. Archive and delete.
4. **Existing features**: XP bar, streaks, mood tracker, contribution graph — all still work.

- [ ] **Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: wave 1 lint and build fixes"
```
