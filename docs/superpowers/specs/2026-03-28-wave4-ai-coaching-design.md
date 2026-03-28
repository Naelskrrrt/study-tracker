# Wave 4 — AI Coaching Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Goal:** Add LLM-powered intelligence to the ADHD study tracker — personal coach, session debriefs, journal enrichment, intelligent emails, AI micro-task generation, and contextual nudges.

**Prerequisites:** Waves 1–3 complete. Existing hooks: `useProgress`, `useActivity`, `useMood`, `useTimer`, `useSubtasks`, `useStats`, `useNotificationAlerts`. Existing models: `StudySession`, `SubTask`, `DailyActivity`, `MoodEntry`, `Deadline`, `TaskCompletion`, `NotificationPreference`.

**PRD Reference:** `docs/superpowers/specs/2026-03-27-adhd-study-tracker-prd.md` — sections 4.1–4.6.

---

## Infrastructure

### LLM Provider

- **Provider:** OpenRouter (unified API, 290+ models)
- **SDK:** Vercel AI SDK (`ai` + `@ai-sdk/openai` — compatible with OpenRouter via base URL override)
- **Models:**
  - **DeepSeek V3.2** — chat, debrief, nudges (fast, conversational). ~$0.32/$0.89 per 1M tokens.
  - **Gemini 3.1 Flash Lite** — email digest, micro-tasks (structured, async). ~$0.25/$1.50 per 1M tokens.
- **Env vars:** `OPENROUTER_API_KEY`
- **Estimated cost:** < $1/month for daily active use.

### Shared AI Client

**File:** `src/lib/ai.ts`

Single module exporting two model instances via Vercel AI SDK's `createOpenAI` with OpenRouter base URL. Exposes:
- `deepseek` — for chat, debrief, nudges
- `geminiFlash` — for email, micro-tasks

### Prisma Schema Changes

```prisma
// Add to User model:
  chatMessages ChatMessage[]

// New model:
model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  role      String   // "user" | "assistant" | "system"
  content   String   @db.Text
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

// Add field to StudySession:
  debrief String? @db.Text

// Add field to JournalEntry (Wave 2 model — if model doesn't exist yet, create it first):
  aiSummary String? @db.Text
```

---

## Feature 4.1 — Personal ADHD Coach (Chatbot)

### Behavior

Floating chat button (bottom-right corner, above mobile BottomNav if any). Clicking opens a slide-up panel covering ~60% of the screen. The panel contains a message list, text input, and send button. Responses stream in real-time.

### System Prompt Strategy

- **First message of conversation:** Rich system prompt injected with full user context:
  - Current progression (completed tasks, total XP, level, phase progress)
  - Today's mood level
  - Current streak length
  - Recent study sessions (last 3, with duration and tasks)
  - Upcoming deadlines (next 30 days)
  - Journal summary if available
- **Subsequent messages:** Conversation continues with chat history only (no context re-injection). The context doesn't change meaningfully within a single chat session.

### System Prompt Content

The coach is:
- An ADHD-specialized study companion, warm and encouraging
- Aware of the NVIDIA certification curriculum (3 phases, specific tasks)
- Focused on actionable micro-advice (not generic motivational platitudes)
- Able to suggest which task to work on next based on progress and mood
- Respectful of low-energy states (doesn't push when mood is 1-2)

### API

**`POST /api/chat`** — Streaming response
- Auth required
- Body: `{ message: string }`
- On first message (no history), fetches user context and builds rich system prompt
- Persists user message and assistant response to `ChatMessage`
- Streams response using Vercel AI SDK `streamText`

**`GET /api/chat/history`** — Paginated history
- Auth required
- Query: `?limit=50&before=<cursor>`
- Returns messages ordered by createdAt desc

### UI Components

**`src/components/ui/ChatButton.tsx`**
- Fixed position bottom-right (`bottom-20 right-4` to clear BottomNav)
- Green NVIDIA-themed circle with chat icon
- Pulse animation when there are unread nudges
- onClick toggles ChatPanel

**`src/components/ui/ChatPanel.tsx`**
- Slide-up panel with `framer-motion` (animate from y: 100% to y: 0)
- Header with "Coach IA" title + close button
- Scrollable message list (user right-aligned, assistant left-aligned)
- Streaming indicator (typing dots) while response generates
- Text input + send button at bottom
- Auto-scroll to latest message
- Max 50 messages displayed, "Charger plus" button for pagination

### Integration

- `ChatButton` added to `src/app/dashboard/layout.tsx` (visible on all dashboard pages)
- `ChatPanel` rendered conditionally based on open state

---

## Feature 4.2 — Session Debrief

### Behavior

After the user stops a study timer, the system generates an AI debrief in the background. A non-blocking toast ("Debrief prêt") appears when the generation completes. Clicking the toast opens a modal with the debrief content.

### Debrief Content

The AI receives:
- Session duration and pause count
- Tasks/subtasks completed during the session
- Today's mood level
- Any brain dump notes from the session period

It generates a 3-4 line summary:
- What was accomplished
- An encouraging observation
- A suggestion for the next session

### API

**`POST /api/sessions/[id]/debrief`**
- Auth required
- Fetches session data + related completions + mood + captures
- Calls DeepSeek V3.2 with structured prompt
- Stores result in `StudySession.debrief`
- Returns `{ debrief: string }`

### UI Components

**`src/components/ui/DebriefToast.tsx`**
- Extends the existing Toast pattern
- Shows "Debrief de ta session prêt" with a "Voir" button
- Click opens a modal (reuses AchievePopup-like styling) with debrief text
- Auto-dismiss after 30 seconds if not clicked

### Integration

- In `useTimer.tsx`, after `handleStop` → fire `POST /api/sessions/[id]/debrief` in background
- On response, trigger the DebriefToast
- Debrief is accessible later via session history (future feature)

---

## Feature 4.3 — Journal AI Enrichment

### Behavior

On the journal page, a "Générer un résumé IA" button generates a narrative paragraph from the day's data. The AI summary is displayed in a distinct section (green left border, sparkle icon) above the journal entry content.

### API

**`POST /api/journal/[date]/summary`**
- Auth required
- Fetches the day's auto-data: tasks completed, XP earned, study time, session count, mood, streak, coins
- Calls DeepSeek V3.2 to generate a motivational narrative synthesis
- Stores result in `JournalEntry.aiSummary`
- Returns `{ summary: string }`

### Trigger

- Manual button press on journal page
- Optionally: auto-generate on first access of yesterday's journal entry

### UI Component

**`src/components/ui/AISummary.tsx`**
- Card with green-nvidia left border
- Sparkle/AI icon in header
- Generated text in italic
- "Regénérer" button to re-trigger generation
- Loading skeleton while generating

---

## Feature 4.4 — Intelligent Email Digest

### Behavior

Upgrade the existing `/api/email/digest` cron endpoint. Instead of the current static HTML template, the cron sends user data to Gemini Flash Lite to generate a personalized narrative email. Falls back to the existing template if the LLM call fails.

### Changes

- Modify `src/lib/email.ts`: add `generateDigestContent(data: DigestData): Promise<string>` that calls Gemini Flash Lite
- Modify `src/app/api/email/digest/route.ts`: call `generateDigestContent` before `sendDigestEmail`, inject AI-generated paragraph into the HTML template
- The email keeps the structured table (tasks, XP, streak) but adds a personalized intro/outro generated by the LLM

### Fallback

If the LLM call fails (timeout, error, rate limit), use the existing static template unchanged. Log the error but don't block email delivery.

---

## Feature 4.5 — AI-Generated Micro-Tasks

### Behavior

On tasks that have no subtasks yet, a "Décomposer avec l'IA" button appears. Clicking it sends the task context to Gemini Flash Lite, which returns 4-6 micro-subtasks (10-15 min each). The user sees a preview list and can edit/delete before confirming. Confirmed subtasks are created via the existing subtask API.

### API

**`POST /api/subtasks/generate`**
- Auth required
- Body: `{ taskId: string }`
- Fetches task details from static data (`PHASES`), user's completed tasks for context
- Calls Gemini Flash Lite with structured output (JSON array of subtask names)
- Returns `{ subtasks: string[] }` (not persisted until user confirms)

### UI Component

**`src/components/ui/GenerateSubtasksButton.tsx`**
- Button: "Décomposer avec l'IA" with sparkle icon
- Loading state: spinner + "L'IA réfléchit..."
- Preview state: editable list of generated subtasks with delete buttons
- Confirm button: calls existing `POST /api/subtasks` for each item
- Cancel button: discards generated list

### Integration

- Added inside `SubTaskList.tsx` — shows only when task has 0 subtasks
- After confirmation, the normal SubTaskList renders the new items

---

## Feature 4.6 — Contextual Nudges

### Behavior

LLM-generated motivational messages displayed in the existing NotificationBanner with severity `"info"`. Generated based on triggers, cached 24h per trigger per user.

### Triggers

| Trigger | When | Context sent to LLM |
|---|---|---|
| `login` | Dashboard mount, once per day | Streak, mood, last session |
| `task_complete` | After completing a task | Task name, phase progress, XP |
| `streak_milestone` | Streak hits 7, 14, 30, 60, 90 | Streak count, total XP |
| `return` | First login after >2 days absence | Days absent, last activity |
| `low_mood` | Mood set to 1 or 2 | Mood level, streak |

### API

**`GET /api/nudge?trigger=<trigger>&context=<json>`**
- Auth required
- Checks cache (in-memory Map or simple DB field) — if nudge exists for this trigger today, return cached version
- Otherwise calls DeepSeek V3.2 with trigger context
- Caches result for 24h
- Returns `{ message: string, trigger: string }`

### Caching

Simple approach: `NudgeCache` stored as JSON on User model or a new lightweight table. Key: `userId + trigger + date`. This avoids unnecessary LLM calls for the same trigger on the same day.

### Integration

- In `src/hooks/useNotifications.ts`: add nudge fetching logic alongside existing alert logic
- Nudges are appended to the alerts array with type `"info"` and severity `"info"`
- The existing `NotificationBanner` renders them with the nvidia green style

---

## File Structure Summary

### New Files

| File | Responsibility |
|---|---|
| `src/lib/ai.ts` | OpenRouter client with DeepSeek + Gemini models |
| `src/app/api/chat/route.ts` | POST streaming chat |
| `src/app/api/chat/history/route.ts` | GET paginated history |
| `src/app/api/sessions/[id]/debrief/route.ts` | POST session debrief |
| `src/app/api/journal/[date]/summary/route.ts` | POST journal AI summary |
| `src/app/api/subtasks/generate/route.ts` | POST AI micro-task generation |
| `src/app/api/nudge/route.ts` | GET contextual nudge |
| `src/components/ui/ChatButton.tsx` | Floating chat trigger |
| `src/components/ui/ChatPanel.tsx` | Slide-up chat interface |
| `src/components/ui/DebriefToast.tsx` | Post-session debrief notification + modal |
| `src/components/ui/AISummary.tsx` | AI-generated journal summary card |
| `src/components/ui/GenerateSubtasksButton.tsx` | AI subtask decomposition flow |
| `src/hooks/useChat.ts` | SWR/state hook for chat panel |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add ChatMessage model, debrief field on StudySession, aiSummary on JournalEntry |
| `src/app/dashboard/layout.tsx` | Add ChatButton |
| `src/hooks/useTimer.tsx` | Trigger debrief after stop |
| `src/hooks/useNotifications.ts` | Add nudge fetching |
| `src/lib/email.ts` | Add AI digest generation |
| `src/app/api/email/digest/route.ts` | Integrate AI-generated content |
| `src/components/ui/SubTaskList.tsx` | Add GenerateSubtasksButton when empty |
| `package.json` | Add `ai`, `@ai-sdk/openai` dependencies |

---

## Implementation Order

The features share the AI infrastructure but are otherwise independent. Recommended task grouping:

1. **Infra** — Install deps, create `ai.ts`, update Prisma schema (ChatMessage + field additions)
2. **4.1 Coach** — Chat API + ChatPanel + ChatButton + useChat hook + layout integration
3. **4.2 Debrief** — Debrief API + DebriefToast + useTimer integration
4. **4.5 Micro-tâches** — Generate API + GenerateSubtasksButton + SubTaskList integration
5. **4.6 Nudges** — Nudge API + useNotifications upgrade
6. **4.3 Journal** — Summary API + AISummary component
7. **4.4 Email** — email.ts upgrade + digest route upgrade

Coach first (biggest, most impactful), then features that build on existing UI (debrief → timer, micro-tasks → subtasks, nudges → banner), then lower-priority enrichments (journal, email).
