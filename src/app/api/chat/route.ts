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

  const completedIds = new Set(completions.map((c: { taskId: string }) => c.taskId));
  const allTasks = PHASES.flatMap((p) => p.tasks);
  const totalXP = allTasks
    .filter((t) => completedIds.has(t.id))
    .reduce((s, t) => s + t.xp, 0);
  const doneCount = completedIds.size;
  const totalCount = allTasks.length;

  // Streak calculation
  const dates = new Set(activities.map((a: { date: string }) => a.date));
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
      (s: { durationMin: number | null; pauseCount: number; taskId: string | null }) =>
        `${s.durationMin}min (${s.pauseCount} pauses) — ${s.taskId ?? "libre"}`
    )
    .join("; ");

  // Upcoming deadlines
  const upcomingDeadlines = deadlines
    .filter((dl: { name: string; targetDate: string | null }) => dl.targetDate)
    .map((dl: { name: string; targetDate: string | null }) => `${dl.name}: ${dl.targetDate}`)
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
  const isFirstMessage = history.length <= 1;
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

  return result.toTextStreamResponse();
}
