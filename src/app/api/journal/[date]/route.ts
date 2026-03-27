import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function generateAutoData(userId: string, date: string) {
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
    streak: 0,
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

  let entry = await prisma.journalEntry.findUnique({
    where: { userId_date: { userId, date } },
  });

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
