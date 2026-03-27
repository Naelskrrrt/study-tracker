import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";

  const captures = await prisma.quickCapture.findMany({
    where: {
      userId: session.user.id,
      archived: archived ? undefined : false,
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(captures);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = (await req.json()) as { content: string };

  if (!content?.trim())
    return Response.json({ error: "Content is required" }, { status: 400 });

  const capture = await prisma.quickCapture.create({
    data: {
      userId: session.user.id,
      content: content.trim(),
    },
  });
  return Response.json(capture, { status: 201 });
}
