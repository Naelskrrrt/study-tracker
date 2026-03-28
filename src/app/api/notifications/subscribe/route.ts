import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription } = (await req.json()) as {
    subscription: PushSubscriptionJSON;
  };

  await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      pushEnabled: true,
      pushSubscription: subscription as any,
    },
    update: {
      pushEnabled: true,
      pushSubscription: subscription as any,
    },
  });

  return Response.json({ ok: true });
}
