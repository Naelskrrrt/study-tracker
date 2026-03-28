import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const before = searchParams.get("before");

  const messages = await prisma.chatMessage.findMany({
    where: {
      userId: session.user.id,
      role: { not: "system" },
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json({
    messages: messages.reverse(),
    hasMore: messages.length === limit,
  });
}
