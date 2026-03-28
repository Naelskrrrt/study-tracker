import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deepseek } from "@/lib/ai";
import { generateText } from "ai";
import { todayString } from "@/lib/utils/dates";

const TRIGGER_PROMPTS: Record<string, (ctx: Record<string, string>) => string> =
  {
    login: (ctx) =>
      `L'utilisateur se connecte. Streak: ${ctx.streak} jours, humeur: ${ctx.mood}, derniere session: ${ctx.lastSession}. Genere un message de bienvenue motivant en 1-2 phrases.`,
    task_complete: (ctx) =>
      `L'utilisateur vient de terminer "${ctx.taskName}". Progression phase: ${ctx.phaseProgress}, XP gagnes: ${ctx.xp}. Genere une felicitation courte et encourageante en 1-2 phrases.`,
    streak_milestone: (ctx) =>
      `L'utilisateur atteint ${ctx.streak} jours de streak ! XP total: ${ctx.totalXP}. Genere un message de celebration en 1-2 phrases.`,
    return: (ctx) =>
      `L'utilisateur revient apres ${ctx.daysAbsent} jours d'absence. Derniere activite: ${ctx.lastActivity}. Genere un message de bienvenue chaleureux sans culpabiliser, en 1-2 phrases.`,
    low_mood: (ctx) =>
      `L'utilisateur a enregistre une humeur de ${ctx.mood}/5. Streak: ${ctx.streak} jours. Genere un message doux et comprehensif, sans pousser a travailler, en 1-2 phrases.`,
  };

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const trigger = searchParams.get("trigger");
  const contextJson = searchParams.get("context") ?? "{}";

  if (!trigger || !TRIGGER_PROMPTS[trigger])
    return Response.json({ error: "Invalid trigger" }, { status: 400 });

  const today = todayString();
  const userId = session.user.id;

  // Check cache
  const cached = await prisma.nudgeCache.findUnique({
    where: { userId_trigger_date: { userId, trigger, date: today } },
  });

  if (cached) {
    return Response.json({ message: cached.message, trigger });
  }

  // Generate nudge
  let context: Record<string, string>;
  try {
    context = JSON.parse(contextJson);
  } catch {
    context = {};
  }

  const prompt = `Tu es un coach TDAH bienveillant. ${TRIGGER_PROMPTS[trigger](context)} Reponds en francais, sois concis.`;

  try {
    const { text } = await generateText({
      model: deepseek,
      prompt,
    });

    // Cache the result
    await prisma.nudgeCache.create({
      data: { userId, trigger, date: today, message: text },
    });

    return Response.json({ message: text, trigger });
  } catch {
    return Response.json({ message: null, trigger }, { status: 500 });
  }
}
