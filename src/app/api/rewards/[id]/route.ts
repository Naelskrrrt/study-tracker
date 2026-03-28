import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    redeem?: boolean;
    name?: string;
    description?: string;
    cost?: number;
    icon?: string;
  };

  if (body.redeem) {
    const reward = await prisma.reward.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!reward) return Response.json({ error: "Not found" }, { status: 404 });
    if (reward.redeemed)
      return Response.json({ error: "Already redeemed" }, { status: 400 });

    // Compute current balance
    const [sessionCoins, subtaskCount, taskCount, moodCount, redeemedCost] =
      await Promise.all([
        prisma.studySession
          .aggregate({
            where: { userId: session.user.id, endedAt: { not: null } },
            _sum: { coinsEarned: true },
          })
          .then((r) => r._sum.coinsEarned ?? 0),
        prisma.subTask.count({
          where: { userId: session.user.id, completed: true },
        }),
        prisma.taskCompletion.count({ where: { userId: session.user.id } }),
        prisma.moodEntry.count({ where: { userId: session.user.id } }),
        prisma.reward
          .aggregate({
            where: { userId: session.user.id, redeemed: true },
            _sum: { cost: true },
          })
          .then((r) => r._sum.cost ?? 0),
      ]);

    const balance =
      sessionCoins + subtaskCount + taskCount * 3 + moodCount - redeemedCost;

    if (balance < reward.cost)
      return Response.json({ error: "Not enough coins" }, { status: 400 });

    const updated = await prisma.reward.update({
      where: { id },
      data: { redeemed: true, redeemedAt: new Date() },
    });
    return Response.json(updated);
  }

  // Regular update (edit reward)
  const updated = await prisma.reward.update({
    where: { id, userId: session.user.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.cost !== undefined && { cost: body.cost }),
      ...(body.icon && { icon: body.icon }),
    },
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.reward.delete({
    where: { id, userId: session.user.id },
  });
  return Response.json({ ok: true });
}
