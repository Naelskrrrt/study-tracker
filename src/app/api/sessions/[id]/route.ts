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
    endedAt?: string;
    durationMin?: number;
    pauseCount?: number;
    totalPauseMin?: number;
    taskId?: string;
    coinsEarned?: number;
  };

  const studySession = await prisma.studySession.update({
    where: { id, userId: session.user.id },
    data: {
      ...(body.endedAt !== undefined && { endedAt: new Date(body.endedAt) }),
      ...(body.durationMin !== undefined && { durationMin: body.durationMin }),
      ...(body.pauseCount !== undefined && { pauseCount: body.pauseCount }),
      ...(body.totalPauseMin !== undefined && { totalPauseMin: body.totalPauseMin }),
      ...(body.taskId !== undefined && { taskId: body.taskId }),
      ...(body.coinsEarned !== undefined && { coinsEarned: body.coinsEarned }),
    },
  });
  return Response.json(studySession);
}
