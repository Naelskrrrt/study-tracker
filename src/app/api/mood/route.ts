import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayString } from "@/lib/utils/dates";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const entries = await prisma.moodEntry.findMany({
    where: {
      userId: session.user.id,
      date: { gte: cutoff },
    },
    orderBy: { date: "desc" },
  });
  return Response.json(entries);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { moodLevel } = (await req.json()) as { moodLevel: number };
  const date = todayString();

  const entry = await prisma.moodEntry.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    create: { userId: session.user.id, date, moodLevel },
    update: { moodLevel },
  });
  return Response.json(entry);
}
