import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

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
      label: "Session d'étude",
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
      label: "Tâche complétée",
      date: t.completedAt,
    })),
    ...moods.map((m) => ({
      type: "mood" as const,
      coins: 1,
      label: "Log mood",
      date: m.recordedAt,
    })),
    ...redeemed.map((r) => ({
      type: "redeem" as const,
      coins: -r.cost,
      label: `Récompense: ${r.name}`,
      date: r.redeemedAt,
    })),
  ];

  history.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return Response.json(history.slice(0, 50));
}
