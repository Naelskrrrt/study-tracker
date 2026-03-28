import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const deadlines = await prisma.deadline.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(deadlines);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, targetDate, isFixed } = (await req.json()) as {
    name: string;
    targetDate: string | null;
    isFixed: boolean;
  };

  const deadline = await prisma.deadline.create({
    data: {
      userId: session.user.id,
      name,
      targetDate,
      isFixed: isFixed ?? false,
    },
  });
  return Response.json(deadline);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = (await req.json()) as { id: string };

  await prisma.deadline.deleteMany({
    where: { id, userId: session.user.id },
  });
  return Response.json({ success: true });
}
