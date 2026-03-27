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
  const body = (await req.json()) as { completed?: boolean; name?: string };

  const data: { completed?: boolean; completedAt?: Date | null; name?: string } =
    {};

  if (body.name !== undefined) {
    data.name = body.name;
  }
  if (body.completed !== undefined) {
    data.completed = body.completed;
    data.completedAt = body.completed ? new Date() : null;
  }

  const updated = await prisma.subTask.updateMany({
    where: { id, userId: session.user.id },
    data,
  });

  if (updated.count === 0)
    return Response.json({ error: "Not found" }, { status: 404 });

  const subtask = await prisma.subTask.findFirst({
    where: { id, userId: session.user.id },
  });
  return Response.json(subtask);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.subTask.deleteMany({
    where: { id, userId: session.user.id },
  });
  return Response.json({ success: true });
}
