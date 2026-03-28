import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/email";
import { todayString } from "@/lib/utils/dates";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayString();

  const prefs = await prisma.notificationPreference.findMany({
    where: { emailAlerts: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  let sent = 0;

  for (const pref of prefs) {
    const alerts: { type: string; message: string }[] = [];

    // Check streak danger: has a streak but no activity today
    const todayActivity = await prisma.dailyActivity.findUnique({
      where: {
        userId_date: { userId: pref.userId, date: today },
      },
    });

    if (!todayActivity) {
      // Check if user had activity yesterday (i.e., has an active streak)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const yesterdayActivity = await prisma.dailyActivity.findUnique({
        where: {
          userId_date: { userId: pref.userId, date: yesterday },
        },
      });

      if (yesterdayActivity) {
        alerts.push({
          type: "streak",
          message:
            "Tu n'as pas encore étudié aujourd'hui — ta streak va se perdre !",
        });
      }
    }

    // Check deadlines < 3 days
    const deadlines = await prisma.deadline.findMany({
      where: { userId: pref.userId },
    });

    for (const dl of deadlines) {
      if (!dl.targetDate) continue;
      const target = new Date(dl.targetDate + "T00:00:00");
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil(
        (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft > 0 && daysLeft <= 3) {
        alerts.push({
          type: "deadline",
          message: `${dl.name} dans ${daysLeft} jour${daysLeft !== 1 ? "s" : ""} !`,
        });
      }
    }

    if (alerts.length > 0) {
      try {
        await sendAlertEmail(pref.user.email, {
          userName: pref.user.name ?? "toi",
          alerts,
        });
        sent++;
      } catch {
        // Continue to next user
      }
    }
  }

  return Response.json({ sent, total: prefs.length });
}
