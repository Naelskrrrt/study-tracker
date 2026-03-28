import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PHASES } from "@/lib/data/tasks";

// Build a map: taskId -> phaseId
const TASK_TO_PHASE = new Map<string, string>();
for (const phase of PHASES) {
  for (const task of phase.tasks) {
    TASK_TO_PHASE.set(task.id, phase.id);
  }
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.studySession.findMany({
    where: {
      userId: session.user.id,
      durationMin: { not: null },
    },
    select: {
      taskId: true,
      durationMin: true,
      startedAt: true,
    },
    orderBy: { startedAt: "asc" },
  });

  // Aggregate by week and phase
  const weekMap = new Map<
    string,
    { green: number; purple: number; amber: number; other: number }
  >();

  let totalMin = 0;

  for (const s of sessions) {
    const weekStart = getWeekStart(s.startedAt.toISOString().slice(0, 10));
    const phaseId = s.taskId ? TASK_TO_PHASE.get(s.taskId) : null;
    const phaseColor =
      PHASES.find((p) => p.id === phaseId)?.color ?? "other";
    const min = s.durationMin ?? 0;

    totalMin += min;

    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { green: 0, purple: 0, amber: 0, other: 0 });
    }
    const week = weekMap.get(weekStart)!;
    if (phaseColor === "green" || phaseColor === "purple" || phaseColor === "amber") {
      week[phaseColor] += min;
    } else {
      week.other += min;
    }
  }

  // Get last 8 weeks
  const now = new Date();
  const weeks: {
    week: string;
    green: number;
    purple: number;
    amber: number;
    other: number;
  }[] = [];

  for (let w = 7; w >= 0; w--) {
    const d = new Date(now);
    d.setDate(d.getDate() - w * 7);
    const weekStart = getWeekStart(d.toISOString().slice(0, 10));
    const data = weekMap.get(weekStart) ?? {
      green: 0,
      purple: 0,
      amber: 0,
      other: 0,
    };
    weeks.push({
      week: new Date(weekStart + "T00:00:00").toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      green: Math.round((data.green / 60) * 10) / 10,
      purple: Math.round((data.purple / 60) * 10) / 10,
      amber: Math.round((data.amber / 60) * 10) / 10,
      other: Math.round((data.other / 60) * 10) / 10,
    });
  }

  const totalHours = Math.round((totalMin / 60) * 10) / 10;

  return Response.json({ weeks, totalHours });
}
