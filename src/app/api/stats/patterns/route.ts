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
      : "Continue à étudier pour voir tes patterns !";

  return Response.json({ days, bestDay: bestDay.day, insight });
}
