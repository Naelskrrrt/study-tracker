import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.budgetItem.findMany({
    where: { userId: session.user.id },
  });
  return Response.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { itemKey, paid } = (await req.json()) as {
    itemKey: string;
    paid: boolean;
  };

  const item = await prisma.budgetItem.upsert({
    where: {
      userId_itemKey: { userId: session.user.id, itemKey },
    },
    create: {
      userId: session.user.id,
      itemKey,
      paid,
      paidAt: paid ? new Date() : null,
    },
    update: {
      paid,
      paidAt: paid ? new Date() : null,
    },
  });
  return Response.json(item);
}
