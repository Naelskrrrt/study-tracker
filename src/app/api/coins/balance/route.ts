import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [sessionCoins, subtaskCount, taskCount, moodCount, redeemedCost] =
    await Promise.all([
      prisma.studySession
        .aggregate({
          where: { userId, endedAt: { not: null } },
          _sum: { coinsEarned: true },
        })
        .then((r) => r._sum.coinsEarned ?? 0),
      prisma.subTask.count({ where: { userId, completed: true } }),
      prisma.taskCompletion.count({ where: { userId } }),
      prisma.moodEntry.count({ where: { userId } }),
      prisma.reward
        .aggregate({
          where: { userId, redeemed: true },
          _sum: { cost: true },
        })
        .then((r) => r._sum.cost ?? 0),
    ]);

  const earned = sessionCoins + subtaskCount + taskCount * 3 + moodCount;
  const balance = earned - redeemedCost;

  return Response.json({
    balance,
    earned,
    spent: redeemedCost,
    breakdown: {
      sessions: sessionCoins,
      subtasks: subtaskCount,
      tasks: taskCount * 3,
      moods: moodCount,
    },
  });
}
