import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const completions = await prisma.taskCompletion.findMany({
    where: { userId: session.user.id },
    select: { taskId: true, xpEarned: true, note: true, completedAt: true },
  });
  return Response.json(completions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, xpEarned } = (await req.json()) as {
    taskId: string;
    xpEarned: number;
  };

  const completion = await prisma.taskCompletion.upsert({
    where: {
      userId_taskId: { userId: session.user.id, taskId },
    },
    create: { userId: session.user.id, taskId, xpEarned },
    update: {},
  });
  return Response.json(completion);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = (await req.json()) as { taskId: string };

  await prisma.taskCompletion.deleteMany({
    where: { userId: session.user.id, taskId },
  });
  return Response.json({ success: true });
}
