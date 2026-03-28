import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayString } from "@/lib/utils/dates";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const activities = await prisma.dailyActivity.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });
  return Response.json(activities);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { xpEarned, taskName } = (await req.json()) as {
    xpEarned: number;
    taskName: string;
  };
  const date = todayString();

  const existing = await prisma.dailyActivity.findUnique({
    where: { userId_date: { userId: session.user.id, date } },
  });

  const activity = await prisma.dailyActivity.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    create: {
      userId: session.user.id,
      date,
      count: 1,
      xpEarned,
      taskNames: [taskName],
    },
    update: {
      count: (existing?.count ?? 0) + 1,
      xpEarned: (existing?.xpEarned ?? 0) + xpEarned,
      taskNames: [...(existing?.taskNames ?? []), taskName],
    },
  });
  return Response.json(activity);
}
