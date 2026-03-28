import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  return Response.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    emailDigest?: boolean;
    emailAlerts?: boolean;
    digestTime?: string;
    pushEnabled?: boolean;
  };

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...(body.emailDigest !== undefined && { emailDigest: body.emailDigest }),
      ...(body.emailAlerts !== undefined && { emailAlerts: body.emailAlerts }),
      ...(body.digestTime !== undefined && { digestTime: body.digestTime }),
      ...(body.pushEnabled !== undefined && { pushEnabled: body.pushEnabled }),
    },
    update: {
      ...(body.emailDigest !== undefined && { emailDigest: body.emailDigest }),
      ...(body.emailAlerts !== undefined && { emailAlerts: body.emailAlerts }),
      ...(body.digestTime !== undefined && { digestTime: body.digestTime }),
      ...(body.pushEnabled !== undefined && { pushEnabled: body.pushEnabled }),
    },
  });

  return Response.json(prefs);
}
