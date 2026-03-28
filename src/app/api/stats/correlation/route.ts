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

  const highMoodAvg = avgs.filter((a) => a.mood >= 4).reduce((s, a) => s + a.avgXP, 0) /
    Math.max(avgs.filter((a) => a.mood >= 4).length, 1) || 0;
  const lowMoodAvg = avgs.filter((a) => a.mood <= 2).reduce((s, a) => s + a.avgXP, 0) /
    Math.max(avgs.filter((a) => a.mood <= 2).length, 1) || 0;

  const ratio = lowMoodAvg > 0 ? (highMoodAvg / lowMoodAvg).toFixed(1) : null;
  const insight = ratio
    ? `Tu es ${ratio}x plus productif quand tu es Motivé vs Fatigué`
    : "Continue à logger ton mood pour voir les corrélations !";

  return Response.json({ points, avgs, insight });
}
