import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  const where = taskId
    ? { userId: session.user.id, taskId }
    : { userId: session.user.id };

  const subtasks = await prisma.subTask.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });
  return Response.json(subtasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId, name, sortOrder } = (await req.json()) as {
    taskId: string;
    name: string;
    sortOrder?: number;
  };

  // Determine next sortOrder if not provided
  let order = sortOrder;
  if (order === undefined) {
    const last = await prisma.subTask.findFirst({
      where: { userId: session.user.id, taskId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    order = (last?.sortOrder ?? -1) + 1;
  }

  const subtask = await prisma.subTask.create({
    data: {
      userId: session.user.id,
      taskId,
      name,
      sortOrder: order,
    },
  });
  return Response.json(subtask, { status: 201 });
}
