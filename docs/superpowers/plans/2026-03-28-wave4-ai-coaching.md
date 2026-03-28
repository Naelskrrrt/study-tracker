# Wave 4 — AI Coaching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add LLM-powered intelligence to the ADHD study tracker — personal coach chatbot, session debriefs, journal enrichment, intelligent email digests, AI micro-task generation, and contextual nudges.

**Architecture:** Vercel AI SDK (`ai` + `@ai-sdk/openai`) connects to OpenRouter (base URL override) exposing two models: DeepSeek V3.2 (chat/debrief/nudges) and Gemini 3.1 Flash Lite (email/micro-tasks). A shared `src/lib/ai.ts` module provides both model instances. New Prisma models (`ChatMessage`, `NudgeCache`) and field additions (`StudySession.debrief`, `JournalEntry.aiSummary`) support persistence. Each feature has its own API route and UI component, integrated into the existing dashboard.

**Tech Stack:** Next.js 16 (App Router), React 19, Vercel AI SDK, OpenRouter, Prisma 7, SWR, framer-motion, Tailwind CSS 4, Vitest

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/lib/ai.ts` | OpenRouter client with DeepSeek + Gemini model instances |
| `src/app/api/chat/route.ts` | POST streaming chat endpoint |
| `src/app/api/chat/history/route.ts` | GET paginated chat history |
| `src/hooks/useChat.ts` | SWR/state hook for chat panel (history, send, streaming) |
| `src/components/ui/ChatButton.tsx` | Floating chat trigger button |
| `src/components/ui/ChatPanel.tsx` | Slide-up chat interface |
| `src/app/api/sessions/[id]/debrief/route.ts` | POST session debrief generation |
| `src/components/ui/DebriefToast.tsx` | Post-session debrief notification + modal |
| `src/app/api/journal/[date]/summary/route.ts` | POST journal AI summary |
| `src/components/ui/AISummary.tsx` | AI-generated journal summary card |
| `src/app/api/subtasks/generate/route.ts` | POST AI micro-task generation |
| `src/components/ui/GenerateSubtasksButton.tsx` | AI subtask decomposition flow |
| `src/app/api/nudge/route.ts` | GET contextual nudge |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ChatMessage`, `NudgeCache`, `JournalEntry` models; add `debrief` field on `StudySession`; add `chatMessages`/`nudgeCaches`/`journalEntries` on `User` |
| `package.json` | Add `ai`, `@ai-sdk/openai` dependencies |
| `src/app/dashboard/layout.tsx` | Add `ChatButton` component |
| `src/hooks/useTimer.tsx` | Fire debrief API after `stop`, expose debrief state |
| `src/hooks/useNotifications.ts` | Add nudge fetching alongside existing alert logic |
| `src/lib/email.ts` | Add `generateDigestContent()` for AI-powered email intro |
| `src/app/api/email/digest/route.ts` | Integrate AI-generated content into digest emails |
| `src/components/ui/SubTaskList.tsx` | Add `GenerateSubtasksButton` when task has 0 subtasks |

---

## Task 1: Install Dependencies & AI Client

**Files:**
- Modify: `package.json`
- Create: `src/lib/ai.ts`
- Test: `src/lib/__tests__/ai.test.ts`

- [ ] **Step 1: Install Vercel AI SDK packages**

```bash
npm install ai @ai-sdk/openai
```

- [ ] **Step 2: Write test for AI client module**

Create `src/lib/__tests__/ai.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn((config) => {
    const modelFn = (modelId: string) => ({ modelId, ...config });
    return modelFn;
  }),
}));

describe("ai client", () => {
  it("exports deepseek model targeting OpenRouter", async () => {
    const { deepseek } = await import("@/lib/ai");
    expect(deepseek).toBeDefined();
    expect((deepseek as any).modelId).toBe("deepseek/deepseek-chat-v3-0324");
  });

  it("exports geminiFlash model targeting OpenRouter", async () => {
    const { geminiFlash } = await import("@/lib/ai");
    expect(geminiFlash).toBeDefined();
    expect((geminiFlash as any).modelId).toBe(
      "google/gemini-2.5-flash-preview"
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/ai.test.ts
```

Expected: FAIL — `src/lib/ai` does not exist.

- [ ] **Step 4: Create AI client module**

Create `src/lib/ai.ts`:

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const deepseek = openrouter("deepseek/deepseek-chat-v3-0324");
export const geminiFlash = openrouter("google/gemini-2.5-flash-preview");
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/ai.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts src/lib/__tests__/ai.test.ts package.json package-lock.json
git commit -m "feat(wave4): add AI client with OpenRouter DeepSeek + Gemini models"
```

---

## Task 2: Prisma Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ChatMessage model, NudgeCache model, JournalEntry model, and update User/StudySession**

Add to `prisma/schema.prisma` — after the `NotificationPreference` model, add:

```prisma
// ── Wave 4: AI Coaching ──

model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String   // "user" | "assistant" | "system"
  content   String   @db.Text
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

model NudgeCache {
  id        String   @id @default(cuid())
  userId    String
  trigger   String
  date      String
  message   String   @db.Text
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, trigger, date])
}

model JournalEntry {
  id        String   @id @default(cuid())
  userId    String
  date      String
  aiSummary String?  @db.Text
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
}
```

Add `debrief` field to the existing `StudySession` model (after `totalPauseMin`):

```prisma
  debrief       String?   @db.Text
```

Add relations to the existing `User` model (after `notificationPreference`):

```prisma
  chatMessages   ChatMessage[]
  nudgeCaches    NudgeCache[]
  journalEntries JournalEntry[]
```

- [ ] **Step 2: Generate Prisma client and apply migration**

```bash
npx prisma migrate dev --name wave4-ai-coaching
```

Expected: Migration created and applied successfully. Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/generated/prisma/
git commit -m "feat(wave4): add ChatMessage, NudgeCache, JournalEntry models and StudySession.debrief"
```

---

## Task 3: Chat API — Streaming Endpoint

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Create the streaming chat endpoint**

Create `src/app/api/chat/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepseek } from "@/lib/ai";
import { streamText } from "ai";
import { PHASES } from "@/lib/data/tasks";
import { todayString } from "@/lib/utils/dates";

async function buildSystemPrompt(userId: string): Promise<string> {
  const today = todayString();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const cutoff30 = thirtyDaysFromNow.toISOString().slice(0, 10);

  const [completions, mood, activities, sessions, deadlines] =
    await Promise.all([
      prisma.taskCompletion.findMany({
        where: { userId },
        select: { taskId: true },
      }),
      prisma.moodEntry.findFirst({
        where: { userId, date: today },
      }),
      prisma.dailyActivity.findMany({
        where: { userId },
        select: { date: true },
        orderBy: { date: "desc" },
      }),
      prisma.studySession.findMany({
        where: { userId, durationMin: { not: null } },
        orderBy: { startedAt: "desc" },
        take: 3,
      }),
      prisma.deadline.findMany({
        where: { userId, targetDate: { lte: cutoff30 } },
      }),
    ]);

  const completedIds = new Set(completions.map((c) => c.taskId));
  const allTasks = PHASES.flatMap((p) => p.tasks);
  const totalXP = allTasks
    .filter((t) => completedIds.has(t.id))
    .reduce((s, t) => s + t.xp, 0);
  const doneCount = completedIds.size;
  const totalCount = allTasks.length;

  // Streak calculation
  const dates = new Set(activities.map((a) => a.date));
  let streak = 0;
  const d = new Date(today + "T00:00:00");
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  // Phase progress
  const phaseProgress = PHASES.map((p) => {
    const done = p.tasks.filter((t) => completedIds.has(t.id)).length;
    return `${p.name}: ${done}/${p.tasks.length}`;
  }).join(", ");

  // Recent sessions
  const recentSessions = sessions
    .map(
      (s) =>
        `${s.durationMin}min (${s.pauseCount} pauses) — ${s.taskId ?? "libre"}`
    )
    .join("; ");

  // Upcoming deadlines
  const upcomingDeadlines = deadlines
    .filter((dl) => dl.targetDate)
    .map((dl) => `${dl.name}: ${dl.targetDate}`)
    .join(", ");

  return `Tu es un coach d'étude spécialisé TDAH pour un étudiant qui prépare les certifications NVIDIA (Deep Learning, NLP, Computer Vision). Tu es chaleureux, encourageant, et focalisé sur des micro-conseils actionnables.

Contexte de l'utilisateur :
- Progression : ${doneCount}/${totalCount} tâches complétées, ${totalXP} XP total
- Phases : ${phaseProgress}
- Humeur aujourd'hui : ${mood ? `${mood.moodLevel}/5` : "non enregistrée"}
- Streak : ${streak} jours consécutifs
- Sessions récentes : ${recentSessions || "aucune"}
- Deadlines : ${upcomingDeadlines || "aucune"}

Règles :
- Donne des conseils courts et actionnables (2-3 phrases max)
- Suggère la prochaine tâche en fonction de la progression et l'humeur
- Si humeur 1-2, ne pousse pas — propose des micro-tâches de 5 min ou une pause
- Utilise le curriculum NVIDIA (3 phases) comme référence
- Réponds en français`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = (await req.json()) as { message: string };
  const userId = session.user.id;

  // Save user message
  await prisma.chatMessage.create({
    data: { userId, role: "user", content: message },
  });

  // Load chat history
  const history = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  // Build messages array
  const isFirstMessage = history.length <= 1; // Only the user message we just saved
  const messages: { role: "user" | "assistant" | "system"; content: string }[] =
    [];

  if (isFirstMessage) {
    const systemPrompt = await buildSystemPrompt(userId);
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const msg of history) {
    if (msg.role === "system") continue;
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  const result = streamText({
    model: deepseek,
    messages,
    onFinish: async ({ text }) => {
      await prisma.chatMessage.create({
        data: { userId, role: "assistant", content: text },
      });
    },
  });

  return result.toDataStreamResponse();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(wave4): add streaming chat API with DeepSeek and context-aware system prompt"
```

---

## Task 4: Chat API — History Endpoint

**Files:**
- Create: `src/app/api/chat/history/route.ts`

- [ ] **Step 1: Create paginated history endpoint**

Create `src/app/api/chat/history/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const before = searchParams.get("before");

  const messages = await prisma.chatMessage.findMany({
    where: {
      userId: session.user.id,
      role: { not: "system" },
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json({
    messages: messages.reverse(),
    hasMore: messages.length === limit,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/history/route.ts
git commit -m "feat(wave4): add paginated chat history endpoint"
```

---

## Task 5: useChat Hook

**Files:**
- Create: `src/hooks/useChat.ts`

- [ ] **Step 1: Create the useChat hook**

Create `src/hooks/useChat.ts`:

```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type HistoryResponse = {
  messages: ChatMessage[];
  hasMore: boolean;
};

export function useChat() {
  const { data, mutate, isLoading } = useSWR<HistoryResponse>(
    "/api/chat/history",
    fetcher,
    { revalidateOnFocus: false }
  );

  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const messages = data?.messages ?? [];
  const hasMore = data?.hasMore ?? false;

  const sendMessage = useCallback(
    async (content: string) => {
      // Optimistic update — add user message
      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      mutate(
        (prev) => ({
          messages: [...(prev?.messages ?? []), tempUserMsg],
          hasMore: prev?.hasMore ?? false,
        }),
        false
      );

      setStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Parse Vercel AI SDK data stream format
          const lines = chunk.split("\n");
          for (const line of lines) {
            // Text chunks start with "0:" in the data stream protocol
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2));
                accumulated += text;
                setStreamingContent(accumulated);
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Chat stream error:", e);
        }
      } finally {
        setStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
        mutate(); // Revalidate to get persisted messages
      }
    },
    [mutate]
  );

  const loadMore = useCallback(async () => {
    if (!messages.length || !hasMore) return;
    const oldest = messages[0];
    const res = await fetch(
      `/api/chat/history?before=${oldest.createdAt}&limit=50`
    );
    const older: HistoryResponse = await res.json();
    mutate(
      (prev) => ({
        messages: [...older.messages, ...(prev?.messages ?? [])],
        hasMore: older.hasMore,
      }),
      false
    );
  }, [messages, hasMore, mutate]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    messages,
    streaming,
    streamingContent,
    hasMore,
    isLoading,
    sendMessage,
    loadMore,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "feat(wave4): add useChat hook with streaming support and pagination"
```

---

## Task 6: ChatButton Component

**Files:**
- Create: `src/components/ui/ChatButton.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Create ChatButton component**

Create `src/components/ui/ChatButton.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";

type Props = {
  onClick: () => void;
};

export default function ChatButton({ onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-nvidia shadow-lg shadow-nvidia/30"
      aria-label="Ouvrir le coach IA"
    >
      <svg
        className="h-5 w-5 text-bg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </motion.button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/ChatButton.tsx
git commit -m "feat(wave4): add floating ChatButton component"
```

---

## Task 7: ChatPanel Component

**Files:**
- Create: `src/components/ui/ChatPanel.tsx`

- [ ] **Step 1: Create ChatPanel component**

Create `src/components/ui/ChatPanel.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChatPanel({ open, onClose }: Props) {
  const {
    messages,
    streaming,
    streamingContent,
    hasMore,
    isLoading,
    sendMessage,
    loadMore,
  } = useChat();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || streaming) return;
    setInput("");
    setSending(true);
    await sendMessage(text);
    setSending(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[60vh] flex-col rounded-t-2xl border-t border-nvidia/30 bg-bg shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-nvidia">Coach IA</h2>
            <button
              onClick={onClose}
              className="text-muted transition-colors hover:text-white"
              aria-label="Fermer"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {hasMore && (
              <button
                onClick={loadMore}
                className="mx-auto block text-xs text-muted hover:text-nvidia transition-colors"
              >
                Charger plus
              </button>
            )}

            {isLoading && messages.length === 0 && (
              <p className="text-center text-xs text-muted/60 italic">
                Chargement...
              </p>
            )}

            {!isLoading && messages.length === 0 && !streaming && (
              <p className="text-center text-xs text-muted/60 italic mt-8">
                Salut ! Pose-moi une question sur tes études.
              </p>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-auto bg-nvidia/20 text-white"
                    : "mr-auto bg-surface text-white/80"
                }`}
              >
                {msg.content}
              </div>
            ))}

            {streaming && streamingContent && (
              <div className="mr-auto max-w-[80%] rounded-xl bg-surface px-3 py-2 text-sm text-white/80">
                {streamingContent}
              </div>
            )}

            {streaming && !streamingContent && (
              <div className="mr-auto flex gap-1 rounded-xl bg-surface px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-nvidia/60 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-nvidia/60 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-nvidia/60 [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écris ton message..."
                disabled={sending || streaming}
                className="flex-1 rounded-xl bg-surface px-3 py-2 text-sm text-white placeholder:text-muted/40 focus:outline-none focus:ring-1 focus:ring-nvidia/50 disabled:opacity-40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending || streaming}
                className="rounded-xl bg-nvidia px-4 py-2 text-sm font-bold text-bg transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                Envoyer
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/ChatPanel.tsx
git commit -m "feat(wave4): add ChatPanel with streaming messages and pagination"
```

---

## Task 8: Integrate Chat into Dashboard Layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Add ChatButton and ChatPanel to dashboard layout**

In `src/app/dashboard/layout.tsx`, add the chat state and components:

Replace the entire file with:

```typescript
"use client";

import { useState } from "react";
import BottomNav from "@/components/ui/BottomNav";
import QuickCaptureModal from "@/components/ui/QuickCaptureModal";
import ChatButton from "@/components/ui/ChatButton";
import ChatPanel from "@/components/ui/ChatPanel";
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
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <TimerProvider>
      <MoodModeWrapper>
        <div className="min-h-screen bg-bg">
          <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</div>
          <BottomNav />
          <QuickCaptureModal />
          {!chatOpen && <ChatButton onClick={() => setChatOpen(true)} />}
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </MoodModeWrapper>
    </TimerProvider>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

```bash
npx next build 2>&1 | head -20
```

Expected: No TypeScript errors related to chat components.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat(wave4): integrate ChatButton and ChatPanel into dashboard layout"
```

---

## Task 9: Session Debrief API

**Files:**
- Create: `src/app/api/sessions/[id]/debrief/route.ts`

- [ ] **Step 1: Create the debrief endpoint**

Create `src/app/api/sessions/[id]/debrief/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepseek } from "@/lib/ai";
import { generateText } from "ai";
import { todayString } from "@/lib/utils/dates";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const studySession = await prisma.studySession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!studySession)
    return Response.json({ error: "Session not found" }, { status: 404 });

  const today = todayString();

  // Gather context
  const [completions, mood, captures] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: {
        userId: session.user.id,
        completedAt: {
          gte: studySession.startedAt,
          lte: studySession.endedAt ?? new Date(),
        },
      },
    }),
    prisma.moodEntry.findFirst({
      where: { userId: session.user.id, date: today },
    }),
    prisma.quickCapture.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: studySession.startedAt,
          lte: studySession.endedAt ?? new Date(),
        },
      },
    }),
  ]);

  const subtasksCompleted = await prisma.subTask.findMany({
    where: {
      userId: session.user.id,
      completed: true,
      completedAt: {
        gte: studySession.startedAt,
        lte: studySession.endedAt ?? new Date(),
      },
    },
  });

  const prompt = `Tu es un coach TDAH. Génère un debrief de session d'étude en 3-4 lignes en français.

Données de la session :
- Durée : ${studySession.durationMin ?? 0} minutes
- Pauses : ${studySession.pauseCount}
- Tâches complétées : ${completions.length}
- Sous-tâches complétées : ${subtasksCompleted.map((s) => s.name).join(", ") || "aucune"}
- Humeur : ${mood ? `${mood.moodLevel}/5` : "non enregistrée"}
- Notes brain dump : ${captures.map((c) => c.content).join("; ") || "aucune"}

Génère :
1. Ce qui a été accompli
2. Une observation encourageante
3. Une suggestion pour la prochaine session

Sois concis et bienveillant.`;

  const { text } = await generateText({
    model: deepseek,
    prompt,
  });

  // Persist debrief
  await prisma.studySession.update({
    where: { id },
    data: { debrief: text },
  });

  return Response.json({ debrief: text });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sessions/[id]/debrief/route.ts
git commit -m "feat(wave4): add session debrief API endpoint"
```

---

## Task 10: DebriefToast Component

**Files:**
- Create: `src/components/ui/DebriefToast.tsx`

- [ ] **Step 1: Create DebriefToast component**

Create `src/components/ui/DebriefToast.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  debrief: string | null;
  visible: boolean;
  onDismiss: () => void;
};

export default function DebriefToast({ debrief, visible, onDismiss }: Props) {
  const [showModal, setShowModal] = useState(false);

  // Auto-dismiss after 30s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 30000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-nvidia/30 bg-surface px-5 py-3 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-nvidia">
                Debrief de ta session pret
              </p>
              <button
                onClick={() => {
                  setShowModal(true);
                  onDismiss();
                }}
                className="rounded-lg bg-nvidia px-3 py-1 text-xs font-bold text-bg"
              >
                Voir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {showModal && debrief && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 max-w-sm rounded-2xl border border-nvidia/30 bg-surface p-6 shadow-2xl"
            >
              <h2 className="text-lg font-bold text-nvidia">Debrief</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80 whitespace-pre-line">
                {debrief}
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="mt-5 w-full rounded-xl bg-nvidia py-2 text-sm font-bold text-bg transition-transform hover:scale-105"
              >
                Fermer
              </button>
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
git add src/components/ui/DebriefToast.tsx
git commit -m "feat(wave4): add DebriefToast component with modal"
```

---

## Task 11: Integrate Debrief into useTimer

**Files:**
- Modify: `src/hooks/useTimer.tsx`

- [ ] **Step 1: Add debrief state and trigger to useTimer**

In `src/hooks/useTimer.tsx`, make the following changes:

Add `debrief` fields to `TimerState`:

```typescript
// Replace the TimerState type
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
  debriefLoading: boolean;
  debriefReady: boolean;
  debriefText: string | null;
};
```

Add `dismissDebrief` to `TimerActions`:

```typescript
// Replace the TimerActions type
type TimerActions = {
  start: (taskId?: string, taskName?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ durationMin: number; pauseCount: number } | null>;
  dismissNudge: () => void;
  setNudgeInterval: (min: number) => void;
  linkTask: (taskId: string, taskName: string) => void;
  dismissDebrief: () => void;
};
```

Add initial debrief values to the `useState` call:

```typescript
// In the useState initial value, add:
    debriefLoading: false,
    debriefReady: false,
    debriefText: null,
```

In the `stop` callback, after the PATCH call succeeds (after `await fetch(\`/api/sessions/${state.sessionId}\`, ...)`), add the debrief trigger:

```typescript
        // Fire debrief in background (after the PATCH try/catch block, before resetting state)
        const sessionIdForDebrief = state.sessionId;
        if (sessionIdForDebrief) {
          setState((s) => ({ ...s, debriefLoading: true }));
          fetch(`/api/sessions/${sessionIdForDebrief}/debrief`, {
            method: "POST",
          })
            .then((r) => r.json())
            .then((data) => {
              setState((s) => ({
                ...s,
                debriefLoading: false,
                debriefReady: true,
                debriefText: data.debrief ?? null,
              }));
            })
            .catch(() => {
              setState((s) => ({ ...s, debriefLoading: false }));
            });
        }
```

**Important:** Move the state reset to happen before the debrief call. The timer UI should reset immediately, but keep `debriefLoading`/`debriefReady`/`debriefText` alive. Replace the state reset at the end of `stop` with:

```typescript
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
      // Keep debrief state — don't reset debriefLoading/debriefReady/debriefText
    }));
```

Add the `dismissDebrief` callback:

```typescript
  const dismissDebrief = useCallback(() => {
    setState((s) => ({
      ...s,
      debriefReady: false,
      debriefText: null,
    }));
  }, []);
```

Update the Provider value to include `dismissDebrief`:

```typescript
      value={{ ...state, start, pause, resume, stop, dismissNudge, setNudgeInterval, linkTask, dismissDebrief }}
```

- [ ] **Step 2: Add DebriefToast to dashboard page**

In `src/app/dashboard/page.tsx`, add the DebriefToast import and render it. Add after the existing Toast component:

Import at the top:

```typescript
import DebriefToast from "@/components/ui/DebriefToast";
```

Add the hook destructuring — in the component, add:

```typescript
  const { debriefReady, debriefText, dismissDebrief } = useTimer();
```

(Add `useTimer` import if not already present: `import { useTimer } from "@/hooks/useTimer";`)

Render the component after the existing `<Toast ... />`:

```tsx
              <DebriefToast
                debrief={debriefText}
                visible={debriefReady}
                onDismiss={dismissDebrief}
              />
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTimer.tsx src/app/dashboard/page.tsx
git commit -m "feat(wave4): integrate debrief generation into timer stop flow"
```

---

## Task 12: AI Micro-Task Generation API

**Files:**
- Create: `src/app/api/subtasks/generate/route.ts`

- [ ] **Step 1: Create the generate endpoint**

Create `src/app/api/subtasks/generate/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiFlash } from "@/lib/ai";
import { generateObject } from "ai";
import { z } from "zod";
import { PHASES } from "@/lib/data/tasks";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = (await req.json()) as { taskId: string };

  // Find task in static data
  const task = PHASES.flatMap((p) => p.tasks).find((t) => t.id === taskId);
  if (!task)
    return Response.json({ error: "Task not found" }, { status: 404 });

  // Get user's completed tasks for context
  const completions = await prisma.taskCompletion.findMany({
    where: { userId: session.user.id },
    select: { taskId: true },
  });
  const completedIds = new Set(completions.map((c) => c.taskId));
  const completedNames = PHASES.flatMap((p) => p.tasks)
    .filter((t) => completedIds.has(t.id))
    .map((t) => t.name);

  const prompt = `Tu es un coach TDAH. Décompose cette tâche d'étude en 4-6 micro-sous-tâches de 10-15 minutes chacune.

Tâche : "${task.name}"
Détails : "${task.detail}"
XP : ${task.xp}

Tâches déjà complétées par l'étudiant : ${completedNames.join(", ") || "aucune"}

Règles :
- Chaque sous-tâche doit être faisable en 10-15 minutes
- Utilise des verbes d'action concrets (Regarder, Coder, Lire, Résumer...)
- Adapte au contexte NVIDIA/Deep Learning
- Sois spécifique (pas de "réviser le cours" mais "Résumer les 3 types de couches CNN")
- Génère exactement un tableau JSON de strings`;

  const { object } = await generateObject({
    model: geminiFlash,
    prompt,
    schema: z.object({
      subtasks: z
        .array(z.string())
        .min(4)
        .max(6)
        .describe("List of micro-subtask names"),
    }),
  });

  return Response.json({ subtasks: object.subtasks });
}
```

- [ ] **Step 2: Check if `zod` is already a dependency — if not, install it**

```bash
npm ls zod 2>/dev/null || npm install zod
```

Note: The `ai` package may already bring `zod` as a peer dependency. Check first.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/subtasks/generate/route.ts package.json package-lock.json
git commit -m "feat(wave4): add AI micro-task generation endpoint with Gemini"
```

---

## Task 13: GenerateSubtasksButton Component

**Files:**
- Create: `src/components/ui/GenerateSubtasksButton.tsx`
- Modify: `src/components/ui/SubTaskList.tsx`

- [ ] **Step 1: Create GenerateSubtasksButton**

Create `src/components/ui/GenerateSubtasksButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  taskId: string;
  onConfirm: (subtasks: string[]) => Promise<void>;
};

export default function GenerateSubtasksButton({ taskId, onConfirm }: Props) {
  const [state, setState] = useState<
    "idle" | "loading" | "preview" | "confirming"
  >("idle");
  const [generated, setGenerated] = useState<string[]>([]);

  const handleGenerate = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/subtasks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setGenerated(data.subtasks);
      setState("preview");
    } catch {
      setState("idle");
    }
  };

  const handleDelete = (index: number) => {
    setGenerated((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number, value: string) => {
    setGenerated((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const handleConfirm = async () => {
    setState("confirming");
    await onConfirm(generated.filter((s) => s.trim()));
    setState("idle");
    setGenerated([]);
  };

  const handleCancel = () => {
    setState("idle");
    setGenerated([]);
  };

  if (state === "idle") {
    return (
      <button
        onClick={handleGenerate}
        className="mt-2 flex items-center gap-1.5 text-xs text-nvidia/70 transition-colors hover:text-nvidia"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
        Decomposer avec l'IA
      </button>
    );
  }

  if (state === "loading") {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted/60 italic">
        <div className="h-3 w-3 animate-spin rounded-full border border-nvidia border-t-transparent" />
        L'IA reflechit...
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 space-y-2 rounded-xl border border-nvidia/20 bg-nvidia/5 p-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-nvidia/60">
          Sous-taches suggerees
        </p>
        {generated.map((subtask, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={subtask}
              onChange={(e) => handleEdit(i, e.target.value)}
              className="flex-1 rounded bg-transparent text-xs text-white/80 border-b border-muted/20 focus:border-nvidia/40 focus:outline-none py-0.5"
            />
            <button
              onClick={() => handleDelete(i)}
              className="text-xs text-muted hover:text-red-400 transition-colors"
            >
              x
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={state === "confirming" || generated.length === 0}
            className="rounded-lg bg-nvidia px-3 py-1 text-xs font-bold text-bg transition-transform hover:scale-105 disabled:opacity-40"
          >
            {state === "confirming" ? "..." : "Confirmer"}
          </button>
          <button
            onClick={handleCancel}
            disabled={state === "confirming"}
            className="rounded-lg border border-muted/30 px-3 py-1 text-xs text-muted hover:text-white transition-colors disabled:opacity-40"
          >
            Annuler
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Integrate into SubTaskList**

In `src/components/ui/SubTaskList.tsx`, add the button when there are 0 subtasks.

Add import at the top:

```typescript
import GenerateSubtasksButton from "@/components/ui/GenerateSubtasksButton";
```

Add a handler inside the component (after `handleAddKeyDown`):

```typescript
  const handleAIConfirm = async (names: string[]) => {
    for (const name of names) {
      await addSubtask(name);
    }
  };
```

Add the button in the JSX — right before the `{/* Add subtask input */}` comment, add:

```tsx
      {/* AI generate button when no subtasks */}
      {!isLoading && subtasks.length === 0 && (
        <GenerateSubtasksButton taskId={taskId} onConfirm={handleAIConfirm} />
      )}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/GenerateSubtasksButton.tsx src/components/ui/SubTaskList.tsx
git commit -m "feat(wave4): add AI subtask generation with editable preview"
```

---

## Task 14: Contextual Nudge API

**Files:**
- Create: `src/app/api/nudge/route.ts`

- [ ] **Step 1: Create the nudge endpoint**

Create `src/app/api/nudge/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepseek } from "@/lib/ai";
import { generateText } from "ai";
import { todayString } from "@/lib/utils/dates";

const TRIGGER_PROMPTS: Record<string, (ctx: Record<string, string>) => string> =
  {
    login: (ctx) =>
      `L'utilisateur se connecte. Streak: ${ctx.streak} jours, humeur: ${ctx.mood}, derniere session: ${ctx.lastSession}. Genere un message de bienvenue motivant en 1-2 phrases.`,
    task_complete: (ctx) =>
      `L'utilisateur vient de terminer "${ctx.taskName}". Progression phase: ${ctx.phaseProgress}, XP gagnes: ${ctx.xp}. Genere une felicitation courte et encourageante en 1-2 phrases.`,
    streak_milestone: (ctx) =>
      `L'utilisateur atteint ${ctx.streak} jours de streak ! XP total: ${ctx.totalXP}. Genere un message de celebration en 1-2 phrases.`,
    return: (ctx) =>
      `L'utilisateur revient apres ${ctx.daysAbsent} jours d'absence. Derniere activite: ${ctx.lastActivity}. Genere un message de bienvenue chaleureux sans culpabiliser, en 1-2 phrases.`,
    low_mood: (ctx) =>
      `L'utilisateur a enregistre une humeur de ${ctx.mood}/5. Streak: ${ctx.streak} jours. Genere un message doux et comprehensif, sans pousser a travailler, en 1-2 phrases.`,
  };

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const trigger = searchParams.get("trigger");
  const contextJson = searchParams.get("context") ?? "{}";

  if (!trigger || !TRIGGER_PROMPTS[trigger])
    return Response.json({ error: "Invalid trigger" }, { status: 400 });

  const today = todayString();
  const userId = session.user.id;

  // Check cache
  const cached = await prisma.nudgeCache.findUnique({
    where: { userId_trigger_date: { userId, trigger, date: today } },
  });

  if (cached) {
    return Response.json({ message: cached.message, trigger });
  }

  // Generate nudge
  let context: Record<string, string>;
  try {
    context = JSON.parse(contextJson);
  } catch {
    context = {};
  }

  const prompt = `Tu es un coach TDAH bienveillant. ${TRIGGER_PROMPTS[trigger](context)} Reponds en francais, sois concis.`;

  try {
    const { text } = await generateText({
      model: deepseek,
      prompt,
    });

    // Cache the result
    await prisma.nudgeCache.create({
      data: { userId, trigger, date: today, message: text },
    });

    return Response.json({ message: text, trigger });
  } catch {
    return Response.json({ message: null, trigger }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/nudge/route.ts
git commit -m "feat(wave4): add contextual nudge API with daily caching"
```

---

## Task 15: Integrate Nudges into useNotifications

**Files:**
- Modify: `src/hooks/useNotifications.ts`

- [ ] **Step 1: Add nudge fetching to useNotificationAlerts**

Replace `src/hooks/useNotifications.ts` with:

```typescript
"use client";

import { useMemo, useEffect, useState, useRef } from "react";
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
  todayMood?: number | null;
};

async function fetchNudge(
  trigger: string,
  context: Record<string, string>
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      trigger,
      context: JSON.stringify(context),
    });
    const res = await fetch(`/api/nudge?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.message ?? null;
  } catch {
    return null;
  }
}

export function useNotificationAlerts({
  streak,
  activeDates,
  deadlines,
  todayMood,
}: UseNotificationsInput): Alert[] {
  const [nudges, setNudges] = useState<Alert[]>([]);
  const nudgeFetchedRef = useRef(false);

  // Fetch login nudge once on mount
  useEffect(() => {
    if (nudgeFetchedRef.current) return;
    nudgeFetchedRef.current = true;

    const context: Record<string, string> = {
      streak: String(streak),
      mood: todayMood != null ? String(todayMood) : "non enregistree",
      lastSession: "recente",
    };

    fetchNudge("login", context).then((msg) => {
      if (msg) {
        setNudges((prev) => [
          ...prev,
          { id: "nudge-login", type: "info", message: msg, severity: "info" },
        ]);
      }
    });
  }, []); // Intentionally run once on mount

  const staticAlerts = useMemo(() => {
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
      if (days <= 0) continue;
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

  return [...staticAlerts, ...nudges];
}
```

- [ ] **Step 2: Update dashboard page to pass todayMood**

In `src/app/dashboard/page.tsx`, update the `useNotificationAlerts` call to include `todayMood`:

```typescript
  const alerts = useNotificationAlerts({
    streak,
    activeDates,
    deadlines: [],
    todayMood: todayLevel,
  });
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNotifications.ts src/app/dashboard/page.tsx
git commit -m "feat(wave4): integrate AI nudges into notification system"
```

---

## Task 16: Journal AI Summary API

**Files:**
- Create: `src/app/api/journal/[date]/summary/route.ts`

- [ ] **Step 1: Create the journal summary endpoint**

Create `src/app/api/journal/[date]/summary/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepseek } from "@/lib/ai";
import { generateText } from "ai";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { date } = await params;
  const userId = session.user.id;
  const nextDay = new Date(date + "T00:00:00Z");
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10);

  // Gather the day's data
  const [activity, mood, sessions, completions] = await Promise.all([
    prisma.dailyActivity.findUnique({
      where: { userId_date: { userId, date } },
    }),
    prisma.moodEntry.findFirst({
      where: { userId, date },
    }),
    prisma.studySession.findMany({
      where: {
        userId,
        startedAt: {
          gte: new Date(date + "T00:00:00Z"),
          lt: new Date(nextDayStr + "T00:00:00Z"),
        },
        durationMin: { not: null },
      },
    }),
    prisma.taskCompletion.findMany({
      where: {
        userId,
        completedAt: {
          gte: new Date(date + "T00:00:00Z"),
          lt: new Date(nextDayStr + "T00:00:00Z"),
        },
      },
    }),
  ]);

  const studyTimeMin = sessions.reduce(
    (s, sess) => s + (sess.durationMin ?? 0),
    0
  );

  // Calculate streak up to that date
  const allActivities = await prisma.dailyActivity.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
  });
  const dates = new Set(allActivities.map((a) => a.date));
  let streak = 0;
  const d = new Date(date + "T00:00:00");
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const prompt = `Tu es un coach TDAH. Ecris un paragraphe narratif de 3-4 phrases resumant la journee d'etude de l'utilisateur. Sois motivant et specifique.

Donnees du ${date} :
- Taches completees : ${activity?.taskNames?.join(", ") || completions.length + " tache(s)"}
- XP gagne : ${activity?.xpEarned ?? 0}
- Temps d'etude : ${studyTimeMin} minutes (${sessions.length} sessions)
- Humeur : ${mood ? `${mood.moodLevel}/5` : "non enregistree"}
- Streak : ${streak} jours

Ecris en francais. Sois concis et encourageant.`;

  const { text } = await generateText({
    model: deepseek,
    prompt,
  });

  // Upsert journal entry
  await prisma.journalEntry.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, aiSummary: text },
    update: { aiSummary: text },
  });

  return Response.json({ summary: text });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/journal/[date]/summary/route.ts
git commit -m "feat(wave4): add journal AI summary generation endpoint"
```

---

## Task 17: AISummary Component

**Files:**
- Create: `src/components/ui/AISummary.tsx`

- [ ] **Step 1: Create AISummary component**

Create `src/components/ui/AISummary.tsx`:

```typescript
"use client";

import { useState } from "react";

type Props = {
  date: string;
  initialSummary?: string | null;
};

export default function AISummary({ date, initialSummary }: Props) {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/journal/${date}/summary`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  if (!summary && !loading) {
    return (
      <button
        onClick={generate}
        className="flex items-center gap-1.5 text-xs text-nvidia/70 transition-colors hover:text-nvidia"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>
        Generer un resume IA
      </button>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border-l-4 border-nvidia bg-nvidia/5 p-4">
        <div className="flex items-center gap-2 text-xs text-muted/60 italic">
          <div className="h-3 w-3 animate-spin rounded-full border border-nvidia border-t-transparent" />
          Generation du resume...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-l-4 border-nvidia bg-nvidia/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-nvidia/80">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
          Resume IA
        </div>
        <button
          onClick={generate}
          className="text-[10px] text-muted/50 hover:text-nvidia transition-colors"
        >
          Regenerer
        </button>
      </div>
      <p className="text-sm italic leading-relaxed text-white/70">{summary}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AISummary.tsx
git commit -m "feat(wave4): add AISummary component for journal enrichment"
```

---

## Task 18: Intelligent Email Digest

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/app/api/email/digest/route.ts`

- [ ] **Step 1: Add AI digest generation to email.ts**

In `src/lib/email.ts`, add the following function after the existing `sendDigestEmail` function:

```typescript
export async function generateDigestContent(
  data: DigestData
): Promise<string | null> {
  try {
    // Dynamic import to avoid loading AI SDK at module level for non-AI email paths
    const { generateText } = await import("ai");
    const { geminiFlash } = await import("@/lib/ai");

    const hours = Math.round((data.studyTimeMin / 60) * 10) / 10;
    const deadlineInfo =
      data.deadlines.length > 0
        ? data.deadlines
            .map((d) => `${d.name} dans ${d.daysLeft} jours`)
            .join(", ")
        : "aucune deadline proche";

    const prompt = `Tu es un coach TDAH. Ecris un paragraphe personnalise de 2-3 phrases pour l'email recap quotidien d'un etudiant.

Donnees du jour :
- Prenom : ${data.userName}
- Taches completees : ${data.tasksCompleted.length} (${data.tasksCompleted.join(", ") || "aucune"})
- XP gagnes : ${data.xpEarned}
- Temps d'etude : ${hours}h
- Streak : ${data.streak} jours
- Humeur moyenne : ${data.moodAvg !== null ? `${data.moodAvg.toFixed(1)}/5` : "non enregistree"}
- Deadlines : ${deadlineInfo}

Sois motivant, specifique et concis. Ecris en francais.`;

    const { text } = await generateText({
      model: geminiFlash,
      prompt,
    });

    return text;
  } catch {
    return null;
  }
}
```

Also export the `DigestData` type — change the line `type DigestData = {` to `export type DigestData = {`.

- [ ] **Step 2: Integrate AI content into digest route**

In `src/app/api/email/digest/route.ts`, add the import and call before `sendDigestEmail`.

Add import at the top:

```typescript
import { sendDigestEmail, generateDigestContent } from "@/lib/email";
```

(Replace the existing `import { sendDigestEmail } from "@/lib/email";`)

Inside the `for` loop, right before the `await sendDigestEmail(...)` call, add:

```typescript
      // Generate AI-powered intro (falls back gracefully)
      const aiContent = await generateDigestContent({
        userName: pref.user.name ?? "toi",
        tasksCompleted: activity?.taskNames ?? [],
        xpEarned: activity?.xpEarned ?? 0,
        studyTimeMin,
        streak,
        moodAvg,
        deadlines: upcomingDeadlines,
      });
```

Update the `sendDigestEmail` call to pass the AI content — modify `sendDigestEmail` signature in `src/lib/email.ts` to accept an optional `aiIntro`:

```typescript
export async function sendDigestEmail(
  to: string,
  data: DigestData,
  aiIntro?: string | null
) {
```

In the HTML template inside `sendDigestEmail`, add the AI intro right after `<p>Salut ${data.userName} !</p>`:

```typescript
      ${aiIntro ? `<p style="color: #a0d060; font-style: italic; margin: 12px 0;">${aiIntro}</p>` : ""}
```

Back in the digest route, update the call:

```typescript
      await sendDigestEmail(
        pref.user.email,
        {
          userName: pref.user.name ?? "toi",
          tasksCompleted: activity?.taskNames ?? [],
          xpEarned: activity?.xpEarned ?? 0,
          studyTimeMin,
          streak,
          moodAvg,
          deadlines: upcomingDeadlines,
        },
        aiContent
      );
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts src/app/api/email/digest/route.ts
git commit -m "feat(wave4): add AI-generated personalized content to email digests"
```

---

## Task 19: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Build the project**

```bash
npx next build 2>&1 | tail -30
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: No lint errors.
