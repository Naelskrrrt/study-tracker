import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sessions = await prisma.studySession.findMany({
    where: { userId: session.user.id, startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
  });
  return Response.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = (await req.json()) as { taskId?: string };

  const studySession = await prisma.studySession.create({
    data: { userId: session.user.id, taskId: taskId ?? null },
  });
  return Response.json(studySession);
}
