import { prisma } from "@/lib/prisma";
import { sendDigestEmail, generateDigestContent } from "@/lib/email";
import { todayString } from "@/lib/utils/dates";

export async function POST(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Find all users with email digest enabled
  const prefs = await prisma.notificationPreference.findMany({
    where: { emailDigest: true },
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
  let errors = 0;

  for (const pref of prefs) {
    try {
      // Gather yesterday's data for this user
      const [activity, moods, sessions, completions, deadlines] =
        await Promise.all([
          prisma.dailyActivity.findUnique({
            where: {
              userId_date: { userId: pref.userId, date: yesterday },
            },
          }),
          prisma.moodEntry.findMany({
            where: {
              userId: pref.userId,
              date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
            },
          }),
          prisma.studySession.findMany({
            where: {
              userId: pref.userId,
              startedAt: {
                gte: new Date(yesterday + "T00:00:00Z"),
                lt: new Date(today + "T00:00:00Z"),
              },
              durationMin: { not: null },
            },
          }),
          prisma.taskCompletion.findMany({
            where: {
              userId: pref.userId,
              completedAt: {
                gte: new Date(yesterday + "T00:00:00Z"),
                lt: new Date(today + "T00:00:00Z"),
              },
            },
          }),
          prisma.deadline.findMany({
            where: { userId: pref.userId },
          }),
        ]);

      // Skip if no activity yesterday
      if (!activity && completions.length === 0 && sessions.length === 0) {
        continue;
      }

      // Calculate streak
      const allActivities = await prisma.dailyActivity.findMany({
        where: { userId: pref.userId },
        select: { date: true },
        orderBy: { date: "desc" },
      });
      const dates = new Set(allActivities.map((a) => a.date));
      let streak = 0;
      const d = new Date(yesterday + "T00:00:00");
      while (dates.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }

      const studyTimeMin = sessions.reduce(
        (s, sess) => s + (sess.durationMin ?? 0),
        0
      );
      const moodAvg =
        moods.length > 0
          ? moods.reduce((s, m) => s + m.moodLevel, 0) / moods.length
          : null;

      const upcomingDeadlines = deadlines
        .filter((dl) => dl.targetDate)
        .map((dl) => {
          const target = new Date(dl.targetDate! + "T00:00:00");
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const daysLeft = Math.ceil(
            (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return { name: dl.name, daysLeft };
        })
        .filter((dl) => dl.daysLeft > 0 && dl.daysLeft <= 30)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      // Generate AI-powered intro (falls back gracefully)
      const aiContent = await generateDigestContent({
        userName: pref.user.name ?? "toi",
        tasksCompleted: activity?.taskNames ?? [],
        xpEarned: activity?.xpEarned ?? 0,
        studyTimeMin,
        streak,
        moodAvg,
        deadlines: upcomingDeadlines,
      });

      await sendDigestEmail(
        pref.user.email,
        {
          userName: pref.user.name ?? "toi",
          tasksCompleted: activity?.taskNames ?? [],
          xpEarned: activity?.xpEarned ?? 0,
          studyTimeMin,
          streak,
          moodAvg,
          deadlines: upcomingDeadlines,
        },
        aiContent
      );

      sent++;
    } catch {
      errors++;
    }
  }

  return Response.json({ sent, errors, total: prefs.length });
}
