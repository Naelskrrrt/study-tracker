import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepseek } from "@/lib/ai";
import { generateText } from "ai";
import { todayString } from "@/lib/utils/dates";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const studySession = await prisma.studySession.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!studySession)
    return Response.json({ error: "Session not found" }, { status: 404 });

  const today = todayString();

  // Gather context
  const [completions, mood, captures] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: {
        userId: session.user.id,
        completedAt: {
          gte: studySession.startedAt,
          lte: studySession.endedAt ?? new Date(),
        },
      },
    }),
    prisma.moodEntry.findFirst({
      where: { userId: session.user.id, date: today },
    }),
    prisma.quickCapture.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: studySession.startedAt,
          lte: studySession.endedAt ?? new Date(),
        },
      },
    }),
  ]);

  const subtasksCompleted = await prisma.subTask.findMany({
    where: {
      userId: session.user.id,
      completed: true,
      completedAt: {
        gte: studySession.startedAt,
        lte: studySession.endedAt ?? new Date(),
      },
    },
  });

  const prompt = `Tu es un coach TDAH. Génère un debrief de session d'étude en 3-4 lignes en français.

Données de la session :
- Durée : ${studySession.durationMin ?? 0} minutes
- Pauses : ${studySession.pauseCount}
- Tâches complétées : ${completions.length}
- Sous-tâches complétées : ${subtasksCompleted.map((s: { name: string }) => s.name).join(", ") || "aucune"}
- Humeur : ${mood ? `${mood.moodLevel}/5` : "non enregistrée"}
- Notes brain dump : ${captures.map((c: { content: string }) => c.content).join("; ") || "aucune"}

Génère :
1. Ce qui a été accompli
2. Une observation encourageante
3. Une suggestion pour la prochaine session

Sois concis et bienveillant.`;

  const { text } = await generateText({
    model: deepseek,
    prompt,
  });

  // Persist debrief
  await prisma.studySession.update({
    where: { id },
    data: { debrief: text },
  });

  return Response.json({ debrief: text });
}
