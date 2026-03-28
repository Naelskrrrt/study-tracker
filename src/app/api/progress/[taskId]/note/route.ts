import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const { note } = (await req.json()) as { note: string };

  const updated = await prisma.taskCompletion.update({
    where: {
      userId_taskId: { userId: session.user.id, taskId },
    },
    data: { note },
  });
  return Response.json(updated);
}
