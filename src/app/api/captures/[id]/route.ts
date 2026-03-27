import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const updated = await prisma.quickCapture.updateMany({
    where: { id, userId: session.user.id },
    data: { archived: true },
  });

  if (updated.count === 0)
    return Response.json({ error: "Not found" }, { status: 404 });

  const capture = await prisma.quickCapture.findFirst({
    where: { id, userId: session.user.id },
  });
  return Response.json(capture);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.quickCapture.deleteMany({
    where: { id, userId: session.user.id },
  });
  return Response.json({ success: true });
}
