import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rewards = await prisma.reward.findMany({
    where: { userId: session.user.id },
    orderBy: [{ redeemed: "asc" }, { createdAt: "desc" }],
  });
  return Response.json(rewards);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, cost, icon } = (await req.json()) as {
    name: string;
    description?: string;
    cost: number;
    icon?: string;
  };

  if (!name || !cost || cost < 1)
    return Response.json({ error: "Name and cost required" }, { status: 400 });

  const reward = await prisma.reward.create({
    data: {
      userId: session.user.id,
      name,
      description: description ?? null,
      cost,
      icon: icon ?? "gift",
    },
  });
  return Response.json(reward);
}
