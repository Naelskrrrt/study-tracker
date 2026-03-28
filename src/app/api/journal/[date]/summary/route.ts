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
