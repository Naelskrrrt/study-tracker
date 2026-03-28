import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PHASES } from "@/lib/data/tasks";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [completions, recentActivity] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: { userId: session.user.id },
      select: { taskId: true, completedAt: true },
    }),
    prisma.dailyActivity.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10),
        },
      },
    }),
  ]);

  const completedIds = new Set(completions.map((c) => c.taskId));

  // Calculate pace: tasks completed per active day over last 14 days
  const recentCompletions = completions.filter((c) => {
    const d = c.completedAt.toISOString().slice(0, 10);
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return d >= cutoff;
  });

  const activeDays14 = recentActivity.length;
  const tasksPerDay =
    activeDays14 > 0 ? recentCompletions.length / activeDays14 : 0;

  const today = new Date();

  const phases = PHASES.map((phase) => {
    const done = phase.tasks.filter((t) => completedIds.has(t.id)).length;
    const total = phase.tasks.length;
    const remaining = total - done;

    let estimatedDate: string | null = null;
    if (remaining > 0 && tasksPerDay > 0) {
      const daysNeeded = Math.ceil(remaining / tasksPerDay);
      const est = new Date(today);
      est.setDate(est.getDate() + daysNeeded);
      estimatedDate = est.toISOString().slice(0, 10);
    } else if (remaining === 0) {
      estimatedDate = null; // Already done
    }

    return {
      id: phase.id,
      name: phase.name,
      color: phase.color,
      done,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      estimatedDate,
      isComplete: remaining === 0,
    };
  });

  return Response.json({ phases, tasksPerDay: Math.round(tasksPerDay * 100) / 100 });
}
